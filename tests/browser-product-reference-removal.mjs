import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9779";
const artifactDir = process.env.ARTIFACT_DIR || "test-artifacts";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const products = [
  { id: 910001, name: "QA Printer", family: "EcoTank", image: "", category: "printers", printerCategory: "ecotank", type: "", size: "", description: "", features: [] },
  { id: 910002, name: "حبر Pigment", family: "", image: "", images: [], category: "inks", type: "", size: "", description: "", features: [] },
  { id: 910003, name: "QA Paper", family: "", image: "", images: [], category: "papers", type: "", size: "", description: "", features: [] },
];

const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocketClient(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
const pending = new Map();
const consoleErrors = [];
const networkFailures = [];
let id = 0;
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const messageId = ++id;
  pending.set(messageId, { resolve, reject });
  socket.send(JSON.stringify({ id: messageId, method, params }));
});
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push(message.params.args.map((argument) => argument.value || argument.description).join(" "));
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails?.text || "Runtime exception");
  if (message.method === "Network.loadingFailed" && !message.params.canceled) networkFailures.push(message.params.errorText);
  if (message.method === "Fetch.requestPaused") {
    const { requestId, request } = message.params;
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/site") {
      void send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "application/json" }], body: Buffer.from(JSON.stringify({ settings: {}, products })).toString("base64") });
    } else if (request.method === "GET" && url.pathname === "/api/admin/hero-slides") {
      void send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "application/json" }], body: Buffer.from(JSON.stringify({ slides: [], settings: {} })).toString("base64") });
    } else void send("Fetch.continueRequest", { requestId });
  }
  if (!message.id) return;
  const handler = pending.get(message.id);
  if (!handler) return;
  pending.delete(message.id);
  if (message.error) handler.reject(new Error(message.error.message)); else handler.resolve(message.result);
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
};
const setCategory = async (category) => {
  await evaluate(`(() => { const select=document.querySelector('.product-editor>label select'); const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; setter.call(select,${JSON.stringify(category)}); select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await delay(80);
};
const assertAbsent = async (context) => {
  assert.equal(await evaluate(`!document.body.innerText.includes('الرقم المرجعي') && !document.querySelector('[name="referenceNumber"], [name="reference_number"], .admin-product-reference, .product-reference-number')`), true, context);
};

await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable"), send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] })]);
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, screenWidth: 1440, screenHeight: 900 });
await send("Page.navigate", { url: `${appUrl}/admin` });
await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.real-admin-page'))");
await evaluate(`([...document.querySelectorAll('.real-admin-toolbar button')].find((button) => button.textContent.trim() === 'المنتجات')).click()`);
await waitFor("Boolean(document.querySelector('.product-admin-layout')) && document.querySelectorAll('.products-manager article').length === 3");

for (const category of ["printers", "inks", "papers"]) {
  await setCategory(category);
  await assertAbsent(`${category} add form`);
  await evaluate(`([...document.querySelectorAll('.products-manager article')].find((article) => article.textContent.includes(${JSON.stringify(products.find((product) => product.category === category).name)})).querySelector('button')).click()`);
  await waitFor("document.querySelector('.product-editor h2').textContent.includes('تعديل المنتج')");
  await assertAbsent(`${category} edit form`);
  await evaluate(`([...document.querySelectorAll('.product-editor-actions button')].find((button) => button.textContent.trim() === 'تفريغ')).click()`);
}
assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, "desktop admin overflow");

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true, screenWidth: 390, screenHeight: 844 });
await delay(150);
await assertAbsent("mobile admin");
assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, "mobile admin overflow");
await mkdir(artifactDir, { recursive: true });
const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await writeFile(join(artifactDir, "product-reference-removal-admin-mobile-390.png"), Buffer.from(screenshot.data, "base64"));

const relevantConsoleErrors = consoleErrors.filter((message) => !message.includes("eval() is not supported in this environment"));
assert.deepEqual(relevantConsoleErrors, []);
assert.deepEqual(networkFailures, []);
console.log(JSON.stringify({ printerAddEdit: "PASS", inkAddEdit: "PASS", paperAddEdit: "PASS", adminList: "PASS", mobile390: "PASS", consoleErrors: relevantConsoleErrors, networkFailures }, null, 2));
socket.close();
