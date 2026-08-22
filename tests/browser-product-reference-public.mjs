import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL;
const referencePath = process.env.REFERENCE_PATH;
const referenceNumber = process.env.REFERENCE_NUMBER;
const referenceName = process.env.REFERENCE_NAME;
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9779";
const artifactDir = process.env.ARTIFACT_DIR || "test-artifacts";
assert.ok(appUrl && referencePath && referenceNumber && referenceName, "APP_URL and reference product variables are required");

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
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
const navigate = async (path, width, height) => {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 760, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url: `${appUrl}${path}` });
  await waitFor("document.readyState === 'complete'");
  await delay(500);
};

await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable")]);
await send("Browser.grantPermissions", { origin: appUrl, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });

for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile390", width: 390, height: 844 }]) {
  await navigate(referencePath, viewport.width, viewport.height);
  const currentUrl = await evaluate("location.href");
  assert.equal(await evaluate("document.querySelector('.printer-summary h1')?.textContent?.trim()"), referenceName);
  assert.equal(await evaluate("document.querySelector('.product-reference-number dd')?.textContent?.trim()"), referenceNumber);
  assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, `${viewport.name} overflow`);
  await evaluate("document.querySelector('.product-share-trigger').click()");
  const whatsappHref = await evaluate("document.querySelector('.product-share-menu a').href");
  const message = decodeURIComponent(new URL(whatsappHref).searchParams.get("text"));
  assert.ok(message.includes(referenceName));
  assert.ok(message.includes(`الرقم المرجعي: ${referenceNumber}`));
  assert.ok(message.includes(currentUrl));
  await evaluate("document.querySelector('.product-share-menu button').click()");
  await delay(120);
  assert.equal(await evaluate("navigator.clipboard.readText()"), currentUrl);
}

await navigate(referencePath, 1440, 900);
await evaluate("document.querySelector('.public-search-button, .header-search-button').click()");
await waitFor("document.querySelector('#search-drawer')?.getAttribute('aria-hidden') === 'false'");
const partialReference = referenceNumber.slice(-6).toLowerCase();
await evaluate(`(() => { const input=document.querySelector('#global-search-input'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,${JSON.stringify(partialReference)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
await waitFor(`Boolean(document.querySelector('.search-result-item[href=${JSON.stringify(referencePath)}]'))`);
await evaluate(`(() => { const select=document.querySelector('#global-search-scope'); const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; setter.call(select,'printers'); select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
await waitFor(`Boolean(document.querySelector('.search-result-item[href=${JSON.stringify(referencePath)}]'))`);

await navigate("/printers", 1440, 900);
await waitFor(`Boolean(document.querySelector('.category-product-row a[href=${JSON.stringify(referencePath)}]'))`);
await evaluate(`document.querySelector('.category-product-row a[href=${JSON.stringify(referencePath)}]').closest('.category-product-row').querySelector('.quick-view').click()`);
await waitFor("Boolean(document.querySelector('.product-modal-shell .product-reference-number dd'))");
assert.equal(await evaluate("document.querySelector('.product-modal-shell .product-reference-number dd').textContent.trim()"), referenceNumber);
await evaluate("document.querySelector('.product-modal-shell').scrollIntoView({block:'center'})");
await mkdir(artifactDir, { recursive: true });
const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
await writeFile(join(artifactDir, "product-reference-production.png"), Buffer.from(screenshot.data, "base64"));

assert.deepEqual(consoleErrors, []);
assert.deepEqual(networkFailures, []);
console.log(JSON.stringify({ detailsDesktop: "PASS", detailsMobile390: "PASS", whatsappReference: "PASS", copyLink: "PASS", partialGlobalSearch: "PASS", categorySearch: "PASS", quickView: "PASS", consoleErrors, networkFailures }, null, 2));
socket.close();
