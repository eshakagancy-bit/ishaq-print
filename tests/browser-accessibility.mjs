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
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try { if (await evaluate(expression)) return; } catch { /* reload swaps execution contexts */ }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
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
assert.equal(await evaluate("Math.abs((document.querySelector('.brand').getBoundingClientRect().left + document.querySelector('.brand').getBoundingClientRect().width / 2) - document.documentElement.clientWidth / 2) < 2"), true, "desktop logo must be centered");
assert.equal(await evaluate("document.querySelector('.menu-btn').getBoundingClientRect().right > innerWidth / 2 && document.querySelector('.favorite-counter').getBoundingClientRect().left < innerWidth / 2"), true, "RTL header controls must occupy opposite physical sides");
await navigate("/", 1440, 900);
assert.equal(await evaluate("Math.abs((document.querySelector('.brand').getBoundingClientRect().left + document.querySelector('.brand').getBoundingClientRect().width / 2) - document.documentElement.clientWidth / 2) < 2"), true, "1440px logo must be centered");
assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, "1440px overflow");
await navigate("/", 1366, 768);

await evaluate("document.querySelector('.favorite-counter').focus()");
await key(" ", "Space");
await delay(250);
assert.equal(await evaluate("document.querySelector('.favorites-panel')?.getAttribute('role')"), "dialog");
assert.equal(await evaluate("Math.abs(document.querySelector('#wishlist-drawer').getBoundingClientRect().left) < 2"), true, "wishlist drawer must open from the left");
assert.equal(await evaluate("document.activeElement?.getAttribute('aria-label')"), "إغلاق قائمة الرغبات");
await evaluate("[...document.querySelectorAll('.favorites-panel button:not([disabled]),.favorites-panel a[href]')].at(-1)?.focus()");
await key("Tab");
assert.equal(await evaluate("document.activeElement?.getAttribute('aria-label')"), "إغلاق قائمة الرغبات", "favorites focus trap");
await key("Escape");
assert.equal(await evaluate("document.querySelector('.favorites-panel')?.getAttribute('aria-hidden')"), "true");
assert.equal(await evaluate("document.activeElement?.classList.contains('favorite-counter')"), true, "favorites focus return");

await evaluate("document.querySelector('.heart').click()");
await waitFor("document.querySelector('.favorite-counter b')?.textContent === '1'");
assert.equal(await evaluate("document.querySelector('.favorite-counter b')?.textContent"), "1", "wishlist badge must reflect real favorites");
await send("Page.reload");
await waitFor("document.readyState === 'complete' && document.querySelector('.favorite-counter b')?.textContent === '1'");
assert.equal(await evaluate("document.querySelector('.favorite-counter b')?.textContent"), "1", "favorites must persist after reload");
await evaluate("document.querySelector('.favorite-counter').click()");
await delay(200);
assert.equal(await evaluate("document.querySelectorAll('#wishlist-drawer .favorites-list article').length"), 1, "saved product must appear in wishlist drawer");
await evaluate("document.querySelector('#wishlist-drawer .remove-favorite').click()");
assert.equal(await evaluate("document.querySelector('.favorite-counter b')"), null, "zero-count badge must be hidden");
assert.equal(await evaluate("Boolean(document.querySelector('#wishlist-drawer .favorites-empty'))"), true, "removal must restore empty state");
await key("Escape");

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
assert.equal(await evaluate(`(() => { const rect=document.querySelector('.brand').getBoundingClientRect(); return rect.width > 0 && rect.left >= 0 && rect.right <= innerWidth; })()`), true, "mobile logo must remain visible inside the viewport");
await evaluate("document.querySelector('.menu-btn').focus()");
await key(" ", "Space");
assert.equal(await evaluate("document.querySelector('.menu-btn').getAttribute('aria-expanded')"), "true");
assert.equal(await evaluate("getComputedStyle(document.querySelector('#site-menu-drawer')).visibility !== 'hidden' && document.querySelector('.menu-overlay').classList.contains('open')"), true);
await delay(300);
assert.equal(await evaluate("Math.abs(document.querySelector('#site-menu-drawer').getBoundingClientRect().right - innerWidth) < 2"), true, "menu drawer must open from the right");
assert.equal(await evaluate("document.activeElement?.classList.contains('drawer-close')"), true, "drawer focus entry");
await evaluate("document.querySelector('.drawer-nav>button:not(.drawer-accordion-trigger)').click()");
await delay(300);
assert.equal(await evaluate("document.querySelector('.menu-overlay').classList.contains('wishlist-open') && document.querySelector('#site-menu-drawer').getAttribute('aria-hidden') === 'true' && document.querySelector('#wishlist-drawer').getAttribute('aria-hidden') === 'false'"), true, "drawers must be mutually exclusive");
await key("Escape");
assert.equal(await evaluate("document.activeElement?.classList.contains('favorite-counter')"), true, "wishlist focus return after menu switch");
await evaluate("document.querySelector('.menu-btn').click()");
await delay(200);
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
