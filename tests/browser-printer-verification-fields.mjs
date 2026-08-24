import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9784";
const artifactsDirectory = new URL("../test-artifacts/", import.meta.url);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const mockedSiteData = {
  settings: {},
  products: [{
    id: 1,
    name: "EPSON Test Printer",
    family: "EcoTank",
    image: "/brand/eshak-logo.png",
    category: "printers",
    printerCategory: "ecotank",
    type: "",
    size: "",
    description: "طابعة اختبار محلية",
    features: [],
    specificationsSourceUrl: "https://example.com/specifications",
    specificationsVerifiedAt: "2026-08-24T00:00:00.000Z",
  }],
};
const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocketClient(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
const pending = new Map();
const consoleErrors = [];
let id = 0;
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push(message.params.args.map((argument) => argument.value || argument.description).join(" "));
  if (message.method === "Fetch.requestPaused") {
    const body = message.params.request.url.includes("/api/site") ? mockedSiteData : { slides: [], settings: {} };
    void send("Fetch.fulfillRequest", {
      requestId: message.params.requestId,
      responseCode: 200,
      responseHeaders: [{ name: "content-type", value: "application/json; charset=utf-8" }],
      body: Buffer.from(JSON.stringify(body)).toString("base64"),
    });
  }
  if (!message.id) return;
  const handler = pending.get(message.id);
  if (!handler) return;
  pending.delete(message.id);
  if (message.error) handler.reject(new Error(message.error.message)); else handler.resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const messageId = ++id;
  pending.set(messageId, { resolve, reject });
  socket.send(JSON.stringify({ id: messageId, method, params }));
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
};
const screenshot = async (name) => {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await mkdir(artifactsDirectory, { recursive: true });
  await writeFile(new URL(name, artifactsDirectory), Buffer.from(result.data, "base64"));
};
const selectCategory = async (category) => evaluate(`(() => {
  const select = document.querySelector('.product-editor select');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, ${JSON.stringify(category)});
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
const assertRemoved = async () => {
  assert.equal(await evaluate("document.querySelector('.product-editor').textContent.includes('رابط مصدر المواصفات')"), false);
  assert.equal(await evaluate("document.querySelector('.product-editor').textContent.includes('تاريخ التحقق')"), false);
  assert.equal(await evaluate("Boolean(document.querySelector('.printer-specifications-editor'))"), true);
  assert.equal(await evaluate("Boolean(document.querySelector('.product-editor button[type=submit]'))"), true);
};

await Promise.all([send("Page.enable"), send("Runtime.enable")]);
await send("Fetch.enable", { patterns: [
  { urlPattern: "*://*/api/site*" },
  { urlPattern: "*://*/api/admin/hero-slides*" },
  { urlPattern: "*://*/api/admin/hero-settings*" },
] });
await send("Page.navigate", { url: `${appUrl}/admin` });
await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.real-admin-page') || document.querySelector('input[name=password]'))");
if (await evaluate("Boolean(document.querySelector('input[name=password]'))")) {
  const password = process.env.QA_ADMIN_PASSWORD;
  if (!password) throw new Error("QA_ADMIN_PASSWORD is required when local admin authentication is enabled");
  await evaluate(`(() => {
    const input = document.querySelector('input[name=password]');
    input.value = ${JSON.stringify(process.env.QA_ADMIN_PASSWORD)};
    input.form.requestSubmit();
  })()`);
  await waitFor("Boolean(document.querySelector('.real-admin-page'))");
}
await evaluate("[...document.querySelectorAll('.real-admin-toolbar nav button')].find((button) => button.textContent.trim() === 'المنتجات').click()");
await waitFor("Boolean(document.querySelector('.product-editor')) && Boolean(document.querySelector('.products-manager'))");

await assertRemoved();
await screenshot("printer-admin-add-desktop.png");

const edited = await evaluate(`(() => {
  const article = [...document.querySelectorAll('.products-manager article')].find((item) => item.textContent.includes('printers') || item.textContent.includes('طابعة') || item.textContent.includes('EPSON'));
  const button = [...(article?.querySelectorAll('button') || [])].find((item) => item.textContent.trim() === 'تعديل');
  button?.click();
  return Boolean(button);
})()`);
assert.equal(edited, true);
await waitFor("document.querySelector('.product-editor h2')?.textContent.includes('تعديل')");
await assertRemoved();

await evaluate("[...document.querySelectorAll('.product-editor button')].find((button) => button.textContent.trim() === 'تفريغ').click()");
await waitFor("document.querySelector('.product-editor h2')?.textContent.includes('إضافة')");
await selectCategory("inks");
await waitFor("document.querySelector('.product-editor fieldset legend')?.textContent.includes('مواصفات الأحبار')");
assert.equal(await evaluate("document.querySelector('.product-editor fieldset legend')?.textContent.includes('مواصفات الأحبار')"), true);
await selectCategory("papers");
await waitFor("Boolean(document.querySelector('.paper-specifications-editor'))");
assert.equal(await evaluate("Boolean(document.querySelector('.paper-specifications-editor'))"), true);
await selectCategory("printers");
await waitFor("Boolean(document.querySelector('.printer-specifications-editor'))");

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), true);
await assertRemoved();
await screenshot("printer-admin-add-mobile-390.png");

const applicationErrors = consoleErrors.filter((message) => !message.includes("eval() is not supported in this environment"));
assert.deepEqual(applicationErrors, []);
console.log(JSON.stringify({ addPrinter: "PASS", editPrinter: "PASS", inksPapers: "PASS", desktop: "PASS", mobile390: "PASS", consoleErrors: applicationErrors }, null, 2));
socket.close();
