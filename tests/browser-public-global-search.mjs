import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9783";
const requireDetails = process.env.REQUIRE_DETAILS === "1";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocketClient(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
const pending = new Map();
const consoleErrors = [];
let id = 0;
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push(message.params.args.map((argument) => argument.value || argument.description).join(" "));
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
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
};
const key = async (value) => {
  const keyCode = value === "Escape" ? 27 : 0;
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: value, code: value, windowsVirtualKeyCode: keyCode });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: value, code: value, windowsVirtualKeyCode: keyCode });
};
const navigate = async (path, width) => {
  await send("Emulation.setDeviceMetricsOverride", { width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1, mobile: width === 390, screenWidth: width, screenHeight: width === 390 ? 844 : 900 });
  await send("Page.navigate", { url: `${appUrl}${path}` });
  await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('main'))");
};
const openAndAssert = async (path, width) => {
  await navigate(path, width);
  const originalPath = await evaluate("location.pathname + location.search + location.hash");
  await evaluate("document.querySelector('.public-search-button,.header-search-button').click()");
  await waitFor("document.querySelector('#search-drawer')?.getAttribute('aria-modal') === 'true'");
  assert.equal(await evaluate("location.pathname + location.search + location.hash"), originalPath);
  assert.equal(await evaluate("document.activeElement?.id"), "global-search-input");
  assert.deepEqual(await evaluate("[...document.querySelectorAll('#global-search-scope option')].map(option => option.value)"), ["all", "printers", "inks", "papers"]);
  return originalPath;
};

await Promise.all([send("Page.enable"), send("Runtime.enable")]);
const results = [];
for (const width of [1366, 390]) {
  for (const path of ["/printers", "/inks", "/papers"]) {
    await openAndAssert(path, width);
    await key("Escape");
    await waitFor("document.querySelector('#search-drawer')?.getAttribute('aria-hidden') === 'true'");
    await openAndAssert(path, width);
    await evaluate("document.querySelector('.menu-overlay').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");
    await waitFor("document.querySelector('#search-drawer')?.getAttribute('aria-hidden') === 'true'");
    await openAndAssert(path, width);
    await evaluate("document.querySelector('#search-drawer .drawer-close').click()");
    await waitFor("document.querySelector('#search-drawer')?.getAttribute('aria-hidden') === 'true'");
    results.push({ path, width, status: "PASS" });
  }
}

await navigate("/printers", 1366);
const detailsPath = await evaluate("document.querySelector('.category-product-row h2 a')?.getAttribute('href')");
if (requireDetails) assert.ok(detailsPath);
if (detailsPath) {
  await openAndAssert(detailsPath, 1366);
  await evaluate(`(() => { const input=document.querySelector('#global-search-input'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'Epson'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await waitFor("document.querySelectorAll('.search-result-item').length > 0");
}
assert.deepEqual(consoleErrors, []);
console.log(JSON.stringify({ results, productDetails: detailsPath ? "PASS" : "SKIPPED_NO_LOCAL_PRODUCTS", searchResults: detailsPath ? "PASS" : "SKIPPED_NO_LOCAL_PRODUCTS", consoleErrors }, null, 2));
socket.close();
