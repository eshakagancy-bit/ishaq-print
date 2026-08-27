import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { seedAdminSession } from "./browser-admin-session.mjs";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");

const CDP_BASE = "http://127.0.0.1:9777";
const APP_URL = process.env.APP_URL || "http://127.0.0.1:3000";
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || APP_URL;
const artifactsDirectory = new URL("../test-artifacts/", import.meta.url);

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function openCdpPage(url) {
  const target = await fetch(`${CDP_BASE}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
  const browserVersion = await fetch(`${CDP_BASE}/json/version`).then((response) => response.json());
  const socket = new WebSocketClient(browserVersion.webSocketDebuggerUrl);
  const pending = new Map();
  const eventWaiters = new Map();
  let messageId = 0;
  let sessionId;

  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });

  socket.on("message", (data) => {
    const message = JSON.parse(data.toString());
    if (message.id) {
      const handler = pending.get(message.id);
      if (!handler) return;
      pending.delete(message.id);
      if (message.error) handler.reject(new Error(message.error.message));
      else handler.resolve(message.result);
      return;
    }
    const waiters = eventWaiters.get(message.method) ?? [];
    eventWaiters.delete(message.method);
    for (const resolve of waiters) resolve(message.params);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  const waitForEvent = (method, timeout = 15_000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
    const waiters = eventWaiters.get(method) ?? [];
    waiters.push((params) => {
      clearTimeout(timer);
      resolve(params);
    });
    eventWaiters.set(method, waiters);
  });

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };

  const navigate = async (nextUrl) => {
    await send("Page.navigate", { url: nextUrl });
    await waitFor(`location.href.startsWith(${JSON.stringify(nextUrl)}) && document.readyState === 'complete'`);
    await evaluate("document.fonts.ready.then(() => true)");
  };

  const waitFor = async (expression, timeout = 10_000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      try {
        if (await evaluate(expression)) return;
      } catch {
        // Navigation can replace the JavaScript execution context between polls.
      }
      await delay(100);
    }
    throw new Error(`Timed out waiting for expression: ${expression}`);
  };

  const screenshot = async (name) => {
    const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await mkdir(artifactsDirectory, { recursive: true });
    await writeFile(new URL(name, artifactsDirectory), Buffer.from(result.data, "base64"));
  };

  sessionId = (await send("Target.attachToTarget", { targetId: target.id, flatten: true })).sessionId;
  await send("Page.enable");
  await send("Runtime.enable");
  await navigate(url);

  return { evaluate, navigate, screenshot, send, socket, waitFor, waitForEvent };
}

const page = await openCdpPage(`${PUBLIC_APP_URL}/printers`);
console.log("home-loaded");
await page.waitFor("document.querySelectorAll('.category-product-row').length > 0");

const initial = await page.evaluate(`(() => ({
  direction: getComputedStyle(document.body).direction,
  productCount: document.querySelectorAll('.category-product-row').length,
  searchLabelled: document.querySelector('.category-products-search input')?.labels?.length > 0,
  removedControls: document.querySelectorAll('.collection-toolbar,.filter-toggle,.collection-sort,.collection-result-count,.printer-category-filters').length,
}))()`);

assert.equal(initial.direction, "rtl");
assert.ok(initial.productCount > 0, "the collection should show the existing printers");
assert.equal(initial.searchLabelled, true);
assert.equal(initial.removedControls, 0);
await page.evaluate(`(() => {
  const input = document.querySelector('.category-products-search input');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'L4360');
  input.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await page.waitFor("document.querySelectorAll('.category-product-row').length === 1");
await page.screenshot("printer-search-only-desktop.png");

await page.send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await delay(150);
const mobileLayout = await page.evaluate(`(() => {
  return {
    removedControls: document.querySelectorAll('.collection-toolbar,.filter-toggle,.collection-sort,.collection-result-count,.printer-category-filters').length,
    fitsWidth: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  };
})()`);
assert.equal(mobileLayout.removedControls, 0);
assert.equal(mobileLayout.fitsWidth, true);
await page.screenshot("printer-search-only-mobile.png");
console.log("home-search-only-passed");

await page.send("Emulation.setDeviceMetricsOverride", {
  width: 1365,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
await seedAdminSession(page.send, APP_URL);
await page.navigate(`${APP_URL}/admin`);
await page.waitFor("Boolean(document.querySelector('input[name=password]') || document.querySelector('.real-admin-toolbar'))");
if (await page.evaluate("Boolean(document.querySelector('input[name=password]'))")) {
  await page.evaluate(`(() => {
    const input = document.querySelector('input[name=password]');
    input.value = 'LocalTest-Only-2026';
    input.form.requestSubmit();
  })()`);
}
await page.waitFor("Boolean(document.querySelector('.real-admin-toolbar'))");
console.log("admin-loaded");
await page.evaluate(`(() => {
  [...document.querySelectorAll('.real-admin-toolbar button')].find((button) => button.textContent.trim() === 'المنتجات').click();
})()`);
await page.waitFor("Boolean(document.querySelector('.product-editor'))");
assert.deepEqual(
  await page.evaluate(`[...document.querySelector('.product-editor select[required]').options].slice(1).map((option) => ({ value: option.value, label: option.textContent.trim() }))`),
  PRINTER_CATEGORIES.map((category) => ({ ...category })),
);

await page.evaluate(`(() => {
  const name = document.querySelector('.product-editor input[required]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  setter.call(name, 'EPSON Test Product');
  name.dispatchEvent(new Event('input', { bubbles: true }));
  name.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('.product-editor button[type=submit]').click();
})()`);
await page.waitFor("Boolean(document.querySelector('#printer-category-error'))");
assert.equal(
  await page.evaluate("document.querySelector('#printer-category-error').textContent.trim()"),
  "يرجى اختيار فئة الطابعة قبل إضافة المنتج.",
);
assert.equal(await page.evaluate("document.querySelectorAll('.products-manager article').length"), 0);

await page.evaluate(`(() => {
  const select = document.querySelector('.product-editor select[required]');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, ${JSON.stringify(PRINTER_CATEGORIES[1].value)});
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await page.waitFor(`document.querySelector('.product-editor select[required]').value === ${JSON.stringify(PRINTER_CATEGORIES[1].value)}`);
await page.screenshot("printer-category-admin-dropdown.png");
assert.equal(await page.evaluate("document.querySelector('.product-editor select[required]').value"), PRINTER_CATEGORIES[1].value);

await page.evaluate(`(() => {
  const select = document.querySelector('.product-editor select[required]');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, ${JSON.stringify(PRINTER_CATEGORIES[2].value)});
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await page.waitFor(`document.querySelector('.product-editor select[required]').value === ${JSON.stringify(PRINTER_CATEGORIES[2].value)}`);
assert.equal(await page.evaluate("document.querySelector('.product-editor select[required]').value"), PRINTER_CATEGORIES[2].value);

console.log(JSON.stringify({
  initialProductCount: initial.productCount,
  filterResults,
  mobileLayout,
  adminDraftValidation: "passed",
}, null, 2));

page.socket.close();
