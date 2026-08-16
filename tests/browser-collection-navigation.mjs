import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9782";
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
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
};
const navigate = async (path, width) => {
  await send("Emulation.setDeviceMetricsOverride", { width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1, mobile: width === 390, screenWidth: width, screenHeight: width === 390 ? 844 : 900 });
  await send("Page.navigate", { url: `${appUrl}${path}` });
  await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.category-product-row'))");
};
const assertDetailsNavigation = async (category, selector, width) => {
  await navigate(`/${category}`, width);
  const expectedPath = await evaluate("document.querySelector('.category-product-row h2 a').getAttribute('href')");
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await waitFor(`location.pathname === ${JSON.stringify(expectedPath)}`);
  assert.equal(await evaluate("Boolean(document.querySelector('.product-modal-shell'))"), false);
};
const inspectCategory = async (category, width) => {
  await assertDetailsNavigation(category, ".category-product-row img", width);
  await assertDetailsNavigation(category, ".category-product-row h2 a", width);

  await navigate(`/${category}`, width);
  const cardPath = await evaluate("document.querySelector('.category-product-row h2 a').getAttribute('href')");
  await evaluate("document.querySelector('.category-product-row').focus()");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await waitFor(`location.pathname === ${JSON.stringify(cardPath)}`);

  await navigate(`/${category}`, width);
  const pathBeforeQuickView = await evaluate("location.pathname");
  await evaluate("document.querySelector('.category-product-row .quick-view').click()");
  await waitFor("Boolean(document.querySelector('.product-modal-shell'))");
  assert.equal(await evaluate("location.pathname"), pathBeforeQuickView);
  await evaluate("document.querySelector('.product-modal-shell .modal-close').click()");
  await waitFor("!document.querySelector('.product-modal-shell')");

  const pathBeforeFavorite = await evaluate("location.pathname");
  const favoriteBefore = await evaluate("document.querySelector('.category-product-row .heart').getAttribute('aria-pressed')");
  await evaluate("document.querySelector('.category-product-row .heart').click()");
  assert.notEqual(await evaluate("document.querySelector('.category-product-row .heart').getAttribute('aria-pressed')"), favoriteBefore);
  assert.equal(await evaluate("location.pathname"), pathBeforeFavorite);
  assert.equal(await evaluate("Boolean(document.querySelector('.product-modal-shell'))"), false);
  return { category, width, status: "PASS" };
};

await Promise.all([send("Page.enable"), send("Runtime.enable")]);
const results = [];
for (const width of [1366, 390]) for (const category of ["printers", "inks", "papers"]) results.push(await inspectCategory(category, width));
assert.deepEqual(consoleErrors, []);
console.log(JSON.stringify({ results, consoleErrors }, null, 2));
socket.close();
