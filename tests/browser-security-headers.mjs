import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3000";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9781";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
const version = await fetch(`${cdpBase}/json/version`).then((response) => response.json());
const socket = new WebSocketClient(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });

const pending = new Map();
const consoleErrors = [];
const blockedRequests = [];
let id = 0;
let sessionId;
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    consoleErrors.push(message.params.args.map((argument) => argument.value || argument.description).join(" "));
  }
  if (message.method === "Network.loadingFailed" && message.params.blockedReason) {
    blockedRequests.push({ url: message.params.url, reason: message.params.blockedReason });
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
  socket.send(JSON.stringify({ id: messageId, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const navigate = async (path, readySelector) => {
  await send("Page.navigate", { url: `${appUrl}${path}` });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(`document.readyState === "complete" && Boolean(document.querySelector(${JSON.stringify(readySelector)}))`)) break;
    await delay(100);
  }
  await delay(250);
};

sessionId = (await send("Target.attachToTarget", { targetId: target.id, flatten: true })).sessionId;
await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable")]);

await navigate("/", ".product-card");
const home = await evaluate(`(() => ({
  images: [...document.images].map((image) => ({ src: image.currentSrc || image.src, loaded: image.complete && image.naturalWidth > 0 })),
  whatsapp: [...document.querySelectorAll('a[href^="https://wa.me/"]')].every((link) => link.href.startsWith("https://wa.me/967")),
  quickViewCount: document.querySelectorAll(".quick-view").length,
}))()`);
assert.ok(home.images.length > 0);
assert.ok(home.images.some((image) => image.loaded), "at least one rendered home image must load");
assert.equal(home.whatsapp, true);
assert.ok(home.quickViewCount > 0);
await evaluate(`document.querySelector(".quick-view").click()`);
for (let attempt = 0; attempt < 50; attempt += 1) {
  if (await evaluate(`Boolean(document.querySelector('.product-modal-shell'))`)) break;
  await delay(100);
}
assert.equal(await evaluate(`Boolean(document.querySelector('.product-modal-shell'))`), true, "Quick View must open under CSP");
for (let attempt = 0; attempt < 30; attempt += 1) {
  if (await evaluate(`document.querySelector('.product-modal-shell img')?.complete === true`)) break;
  await delay(100);
}
assert.equal(await evaluate(`(() => { const image = document.querySelector('.product-modal-shell img'); return !image || image.naturalWidth > 0; })()`), true, "Quick View image must not be blocked");

for (const path of ["/printers", "/papers", "/inks"]) await navigate(path, "h1");
await navigate("/admin", "h1");
assert.equal(await evaluate(`Boolean(document.querySelector('form[action="/api/admin/login"]')) || Boolean(document.querySelector('.real-admin-header'))`), true);

assert.deepEqual(blockedRequests, []);
assert.deepEqual(consoleErrors.filter((message) => /content security policy|refused to|blocked/i.test(message)), []);
console.log(JSON.stringify({ homeImages: home.images.length, quickView: true, admin: true, blockedRequests, cspConsoleErrors: [] }));
socket.close();
