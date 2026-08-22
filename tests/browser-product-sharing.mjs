import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9779";
const artifactDir = process.env.ARTIFACT_DIR || "test-artifacts";
const requireAllCategories = process.env.REQUIRE_ALL_CATEGORIES === "1";
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
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails?.text || "Runtime exception");
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
const key = async (value, code = value) => {
  const keyCode = value === "Enter" ? 13 : value === "Escape" ? 27 : value === " " ? 32 : 0;
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: value, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: value, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode });
  await delay(120);
};
const click = async (selector) => {
  const point = await evaluate(`(() => { const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", buttons: 1, clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", buttons: 0, clickCount: 1 });
  await delay(100);
};
const navigate = async (url, width, height) => {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 760, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate("document.readyState === 'complete'")) break;
    await delay(100);
  }
  await delay(600);
};
const screenshot = async (name) => {
  await mkdir(artifactDir, { recursive: true });
  const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(artifactDir, name), Buffer.from(image.data, "base64"));
};

await Promise.all([send("Page.enable"), send("Runtime.enable")]);
await send("Browser.grantPermissions", { origin: appUrl, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });

const routes = ["printers", "inks", "papers"];
const results = {};
for (const route of routes) {
  await navigate(`${appUrl}/${route}`, 1440, 900);
  const detailsPath = await evaluate(`document.querySelector('.category-product-row a[href^="/${route}/"]')?.getAttribute('href')`);
  if (!detailsPath && !requireAllCategories) {
    results[`${route}-local-catalog`] = "SKIP_EMPTY";
    continue;
  }
  assert.ok(detailsPath, `${route} needs a real details route`);

  for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile390", width: 390, height: 844 }]) {
    await navigate(`${appUrl}${detailsPath}`, viewport.width, viewport.height);
    const currentUrl = await evaluate("location.href");
    const productName = await evaluate("document.querySelector('.printer-summary h1')?.textContent?.trim()");
    assert.ok(productName, `${route} needs its real product name`);
    assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, `${route} ${viewport.name} overflow`);
    assert.equal(await evaluate("document.querySelectorAll('.product-share-trigger').length"), 1, `${route} ${viewport.name} share button`);
    assert.equal(await evaluate("document.querySelector('.product-share-trigger').getAttribute('aria-expanded')"), "false");
    assert.equal(await evaluate("document.querySelector('.product-share-trigger').getBoundingClientRect().left >= 0 && document.querySelector('.product-share-trigger').getBoundingClientRect().right <= innerWidth"), true);

    await evaluate("document.querySelector('.product-share-trigger').focus()");
    await key(" ", "Space");
    assert.equal(await evaluate("document.querySelector('.product-share-trigger').getAttribute('aria-expanded')"), "true");
    assert.equal(await evaluate("document.querySelector('.product-share-menu').getAttribute('role')"), "menu");
    assert.equal(await evaluate("document.querySelectorAll('.product-share-menu [role=menuitem]').length"), 2);
    assert.equal(await evaluate("document.querySelector('.product-share-menu').getBoundingClientRect().left >= 0 && document.querySelector('.product-share-menu').getBoundingClientRect().right <= innerWidth"), true, `${route} ${viewport.name} menu viewport`);
    assert.equal(await evaluate("[...document.querySelectorAll('.product-share-menu [role=menuitem]')].every((item) => item.getBoundingClientRect().height >= 44)"), true, `${route} touch targets`);

    const whatsapp = await evaluate(`(() => { const link = document.querySelector('.product-share-menu a'); return { href: link.href, target: link.target, rel: link.rel }; })()`);
    const whatsappMessage = decodeURIComponent(new URL(whatsapp.href).searchParams.get("text"));
    assert.match(whatsapp.href, /^https:\/\/wa\.me\/\?text=/);
    assert.ok(whatsappMessage.includes(productName), `${route} WhatsApp product name`);
    assert.ok(whatsappMessage.includes(currentUrl), `${route} WhatsApp product URL`);
    assert.equal(whatsapp.target, "_blank");
    assert.match(whatsapp.rel, /noopener/);
    assert.match(whatsapp.rel, /noreferrer/);

    await evaluate("document.querySelector('.product-share-menu button').click()");
    await delay(120);
    assert.equal(await evaluate("Boolean(document.querySelector('.product-share-menu'))"), false, `${route} copy closes menu`);
    assert.equal(await evaluate("document.querySelector('.product-share-feedback').textContent"), "تم نسخ الرابط");
    assert.equal(await evaluate("navigator.clipboard.readText()"), currentUrl, `${route} copied URL`);

    await evaluate("document.querySelector('.product-share-trigger').click()");
    await key("Escape");
    assert.equal(await evaluate("Boolean(document.querySelector('.product-share-menu'))"), false, `${route} Escape closes menu`);
    assert.equal(await evaluate("document.activeElement === document.querySelector('.product-share-trigger')"), true, `${route} Escape restores focus`);

    await evaluate("document.querySelector('.product-share-trigger').click()");
    await click(".printer-summary h1");
    assert.equal(await evaluate("Boolean(document.querySelector('.product-share-menu'))"), false, `${route} outside click closes menu`);
    results[`${route}-${viewport.name}`] = "PASS";
  }
}

await navigate(`${appUrl}/printers`, 1440, 900);
const printerPath = await evaluate("document.querySelector('.category-product-row a[href^=\"/printers/\"]')?.getAttribute('href')");
await navigate(`${appUrl}${printerPath}`, 1440, 900);
await evaluate("document.querySelector('.product-share-trigger').scrollIntoView({ block: 'center' })");
await delay(150);
await evaluate("document.querySelector('.product-share-trigger').click()");
await screenshot("product-sharing-desktop.png");
await navigate(`${appUrl}${printerPath}`, 390, 844);
await evaluate("document.querySelector('.product-share-trigger').scrollIntoView({ block: 'center' })");
await delay(150);
await evaluate("document.querySelector('.product-share-trigger').click()");
await screenshot("product-sharing-mobile-390.png");

assert.deepEqual(consoleErrors, []);
console.log(JSON.stringify({ ...results, consoleErrors }, null, 2));
socket.close();
