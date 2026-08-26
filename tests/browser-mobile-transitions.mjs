import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3000";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9777";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocketClient(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
const pending = new Map();
const consoleErrors = [];
const pageErrors = [];
let id = 0;
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push(message.params.args.map((argument) => argument.value || argument.description).join(" "));
  if (message.method === "Runtime.exceptionThrown") pageErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
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
const waitFor = async (expression, message) => {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(message || `Timed out waiting for: ${expression}`);
};
const navigateHome = async (width, height) => {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width === 390, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url: appUrl });
  await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.mobile-bottom-nav'))", `${width}: home did not load`);
};

await Promise.all([send("Page.enable"), send("Runtime.enable")]);
await navigateHome(390, 844);
assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), true, "mobile page has horizontal overflow");
assert.equal(await evaluate("getComputedStyle(document.querySelector('.mobile-bottom-nav')).display !== 'none'"), true, "mobile bottom navigation is hidden");

const labels = await evaluate("[...document.querySelector('.mobile-bottom-nav').children].map(action => action.textContent.trim())");
assert.equal(labels.length, 4, "mobile bottom navigation must expose four actions");

const clickBottomAction = async (index) => evaluate(`document.querySelector('.mobile-bottom-nav').children[${index}].click()`);
await clickBottomAction(1);
await waitFor("location.pathname === '/categories'", "categories action did not open /categories");
await navigateHome(390, 844);
await clickBottomAction(2);
await waitFor("document.querySelector('.menu-overlay').classList.contains('search-open')", "search action did not open the search drawer");
assert.equal(await evaluate("document.activeElement?.id"), "global-search-input", "search input did not receive focus");
await evaluate("document.querySelector('#search-drawer .drawer-close').click()");
await waitFor("!document.querySelector('.menu-overlay').classList.contains('open')", "search drawer did not close");
await clickBottomAction(3);
await waitFor("Boolean(document.getElementById('contact')) && document.getElementById('contact').getBoundingClientRect().top < innerHeight", "contact action did not scroll to contact");
await clickBottomAction(0);
await waitFor("scrollY < 5", "home action did not return to the top");

const categoryRoutes = await evaluate("[...document.querySelectorAll('.storefront-category-card[href]')].map(link => link.getAttribute('href')).filter(href => ['/printers','/inks','/papers'].includes(href))");
assert.deepEqual([...new Set(categoryRoutes)].sort(), ["/inks", "/papers", "/printers"]);
for (const route of ["/printers", "/inks", "/papers"]) {
  await send("Page.navigate", { url: `${appUrl}${route}` });
  await waitFor(`location.pathname === ${JSON.stringify(route)} && Boolean(document.querySelector('main h1'))`, `${route} did not open`);
  assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), true, `${route} has mobile overflow`);
}

await navigateHome(1440, 1000);
assert.equal(await evaluate("getComputedStyle(document.querySelector('.mobile-bottom-nav')).display === 'none'"), true, "desktop bottom navigation must be hidden");
assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"), true, "desktop page has horizontal overflow");
assert.deepEqual(consoleErrors, []);
assert.deepEqual(pageErrors, []);
console.log(JSON.stringify({ mobile390: "PASS", desktop1440: "PASS", categoryRoutes: "PASS", consoleErrors, pageErrors }, null, 2));
socket.close();
