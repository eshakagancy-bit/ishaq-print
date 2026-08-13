import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9781";
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
const navigate = async (path, width) => {
  await send("Emulation.setDeviceMetricsOverride", { width, height: width === 390 ? 844 : 768, deviceScaleFactor: 1, mobile: width === 390, screenWidth: width, screenHeight: width === 390 ? 844 : 768 });
  await send("Page.navigate", { url: `${appUrl}${path}` });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('main'))")) break;
    await delay(100);
  }
  await delay(400);
};
const inspectCategory = async (category, width) => {
  await navigate(`/${category}`, width);
  assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
  if (!await evaluate("Boolean(document.querySelector('.category-product-row'))")) {
    return { category, width, status: "NO LOCAL PRODUCTS", overflow: false };
  }
  assert.equal(await evaluate("document.querySelectorAll('.category-product-row .product-badge').length <= document.querySelectorAll('.category-product-row').length"), true);
  const expectedAvailability = category === "papers" ? await evaluate("document.querySelector('.category-product-row [data-availability]')?.textContent?.trim() || null") : null;
  await evaluate(`(() => { const card = ${category === "papers" ? "document.querySelector('.category-product-row:has([data-availability])')" : "null"} || document.querySelector('.category-product-row'); card?.querySelector('.quick-view')?.click(); })()`);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await evaluate("Boolean(document.querySelector('.product-modal-shell'))")) break;
    await delay(100);
  }
  assert.equal(await evaluate("Boolean(document.querySelector('.product-modal-shell'))"), true, `${category}: Quick View must open`);
  const signals = await evaluate(`(() => ({
    listAvailability: [...document.querySelectorAll('.category-product-row [data-availability]')].map((item) => item.textContent.trim()),
    modalAvailability: document.querySelector('.product-modal-shell [data-availability]')?.textContent?.trim() || null,
    modalBadges: document.querySelectorAll('.product-modal-shell .modal-product-badge').length,
    detailsHref: document.querySelector('.product-modal-shell .modal-more-details')?.getAttribute('href') || null,
    cta: document.querySelector('.product-modal-shell .primary-btn')?.textContent?.trim() || null,
    overflow: document.documentElement.scrollWidth > innerWidth,
  }))()`);
  assert.equal(signals.overflow, false);
  assert.ok(signals.modalBadges <= 1);
  assert.match(signals.cta || "", /اعرف السعر والتوفر/);
  if (category === "papers") {
    assert.equal(signals.modalAvailability, expectedAvailability);
    if (expectedAvailability) assert.ok(signals.listAvailability.includes(expectedAvailability));
  } else {
    assert.deepEqual(signals.listAvailability, []);
    assert.equal(signals.modalAvailability, null);
  }
  assert.ok(signals.detailsHref);
  await navigate(signals.detailsHref, width);
  const detailAvailability = await evaluate("document.querySelector('[data-availability]')?.textContent?.trim() || null");
  assert.equal(detailAvailability, category === "papers" ? expectedAvailability : null);
  assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
  return { category, width, expectedAvailability, signals, detailAvailability };
};

await Promise.all([send("Page.enable"), send("Runtime.enable")]);
const results = [];
for (const width of [1366, 390]) for (const category of ["printers", "papers", "inks"]) results.push(await inspectCategory(category, width));
assert.deepEqual(consoleErrors, []);
console.log(JSON.stringify({ results, consoleErrors }, null, 2));
socket.close();
