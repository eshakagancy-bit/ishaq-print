import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9779";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocketClient(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
const pending = new Map();
const consoleErrors = [];
let id = 0;
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    consoleErrors.push(message.params.args.map((argument) => argument.value || argument.description).join(" "));
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
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const key = async (keyValue, code = keyValue, modifiers = 0) => {
  const keyCode = keyValue === "Tab" ? 9 : keyValue === "Enter" ? 13 : keyValue === "Escape" ? 27 : keyValue === " " ? 32 : 0;
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: keyValue, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: keyValue, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers });
  await delay(100);
};
const navigate = async (path, width, height) => {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 760, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url: `${appUrl}${path}` });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate("document.readyState === 'complete'")) break;
    await delay(100);
  }
  await delay(500);
};

await Promise.all([send("Page.enable"), send("Runtime.enable")]);

await navigate("/", 1366, 768);
await evaluate("document.body.focus()");
await key("Tab");
assert.equal(await evaluate("document.activeElement?.classList.contains('skip-link')"), true, "skip link must be first");
assert.equal(await evaluate("getComputedStyle(document.activeElement).transform === 'none' || document.activeElement.getBoundingClientRect().top >= 0"), true, "skip link must become visible");
await key("Enter");
assert.equal(await evaluate("document.activeElement?.id"), "main-content", "skip link must focus main content");

assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, "desktop overflow");
assert.equal(await evaluate("[...document.querySelectorAll('.product-group[aria-hidden=true]')].every((group) => group.inert)"), true, "inactive slides must be inert");

await evaluate("document.querySelector('.favorite-counter').focus()");
await key(" ", "Space");
assert.equal(await evaluate("document.querySelector('.favorites-panel')?.getAttribute('role')"), "dialog");
assert.equal(await evaluate("document.activeElement?.getAttribute('aria-label')"), "إغلاق المفضلة");
await evaluate("[...document.querySelectorAll('.favorites-panel button:not([disabled]),.favorites-panel a[href]')].at(-1)?.focus()");
await key("Tab");
assert.equal(await evaluate("document.activeElement?.getAttribute('aria-label')"), "إغلاق المفضلة", "favorites focus trap");
await key("Escape");
assert.equal(await evaluate("Boolean(document.querySelector('.favorites-panel'))"), false);
assert.equal(await evaluate("document.activeElement?.classList.contains('favorite-counter')"), true, "favorites focus return");

await evaluate("document.querySelector('.quick-view').focus()");
await key(" ", "Space");
assert.equal(await evaluate("document.querySelector('.product-modal-shell')?.getAttribute('aria-modal')"), "true");
assert.equal(await evaluate("document.activeElement?.classList.contains('modal-close')"), true, "quick view focus entry");
await evaluate("[...document.querySelectorAll('.product-modal-shell a[href],.product-modal-shell button:not([disabled])')].at(-1)?.focus()");
await key("Tab");
assert.equal(await evaluate("document.activeElement?.classList.contains('modal-close')"), true, "quick view focus trap");
await key("Escape");
assert.equal(await evaluate("Boolean(document.querySelector('.product-modal-shell'))"), false);
assert.equal(await evaluate("document.activeElement?.classList.contains('quick-view')"), true, "quick view focus return");

await navigate("/printers", 1366, 768);
assert.equal(await evaluate("document.querySelector('.category-products-search input')?.labels?.length > 0"), true, "search needs a label");
await evaluate("document.querySelectorAll('.printer-category-filters button')[1].focus()");
await key(" ", "Space");
assert.equal(await evaluate("document.querySelectorAll('.printer-category-filters button')[1].getAttribute('aria-pressed')"), "true", "filter state");
assert.notEqual(await evaluate("getComputedStyle(document.activeElement).outlineStyle"), "none", "focus indicator");

await navigate("/", 390, 844);
assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, "mobile overflow");
await evaluate("document.querySelector('.menu-btn').focus()");
await key(" ", "Space");
assert.equal(await evaluate("document.querySelector('.menu-btn').getAttribute('aria-expanded')"), "true");
assert.equal(await evaluate("getComputedStyle(document.querySelector('#site-menu-drawer')).visibility !== 'hidden' && document.querySelector('.menu-overlay').classList.contains('open')"), true);
await delay(50);
assert.equal(await evaluate("document.activeElement?.classList.contains('drawer-close')"), true, "drawer focus entry");
await key("Escape");
assert.equal(await evaluate("document.querySelector('.menu-btn').getAttribute('aria-expanded')"), "false");
assert.equal(await evaluate("document.activeElement?.classList.contains('menu-btn')"), true, "menu focus return");

await evaluate("document.querySelector('.heart').focus()");
const favoriteLabelBefore = await evaluate("document.activeElement.getAttribute('aria-label')");
await key(" ", "Space");
assert.notEqual(await evaluate("document.activeElement.getAttribute('aria-label')"), favoriteLabelBefore, "favorite label state");
assert.equal(await evaluate("document.activeElement.getAttribute('aria-pressed')"), "true");
assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, "mobile overflow after interaction");

assert.deepEqual(consoleErrors, []);
console.log(JSON.stringify({ desktop: "PASS", mobile390: "PASS", skipLink: "PASS", mobileMenu: "PASS", filters: "PASS", favorites: "PASS", quickView: "PASS", consoleErrors }, null, 2));
socket.close();
