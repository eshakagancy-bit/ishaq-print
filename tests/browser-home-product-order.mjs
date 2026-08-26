import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { seedAdminSession } from "./browser-admin-session.mjs";
import path from "node:path";
import os from "node:os";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3012";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9778";
const adminPassword = process.env.ADMIN_PASSWORD;

const products = [
  [1, "printers", "Epson L3250"], [2, "printers", "Epson L8050"],
  [3, "papers", "Paper A4"], [4, "papers", "Photo Paper"],
  [5, "inks", "Ink 001"], [6, "inks", "Ink 003"],
].map(([id, category, name], index) => ({
  id, category, name, family: "", image: "/brand/eshak-logo.png", type: "", size: "",
  description: "", features: [], sortOrder: index, homeDisplayOrder: index % 2,
}));
let storedProducts = structuredClone(products);
let saveRequests = 0;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const target = await fetch(`${cdpUrl}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" })
  .then((response) => response.json());
const browserVersion = await fetch(`${cdpUrl}/json/version`).then((response) => response.json());
const socket = new WebSocketClient(browserVersion.webSocketDebuggerUrl);
const pending = new Map();
const handlers = new Map();
let messageId = 0;
let sessionId;
await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});
socket.on("message", (data) => {
  const message = JSON.parse(data.toString());
  if (message.id) {
    const pendingCall = pending.get(message.id);
    if (!pendingCall) return;
    pending.delete(message.id);
    if (message.error) pendingCall.reject(new Error(message.error.message));
    else pendingCall.resolve(message.result);
    return;
  }
  handlers.get(message.method)?.(message.params);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++messageId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression, timeout = 20_000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    try {
      if (await evaluate(expression)) return;
    } catch {
      // Navigation replaces the JavaScript execution context.
    }
    await delay(100);
  }
  throw new Error(`Timed out: ${expression}`);
};
const navigate = async (url) => {
  await send("Page.navigate", { url });
  await waitFor(`location.href.startsWith(${JSON.stringify(url)}) && document.readyState === "complete"`);
};

  sessionId = (await send("Target.attachToTarget", { targetId: target.id, flatten: true })).sessionId;
  await send("Page.enable");
  await send("Runtime.enable");
  await seedAdminSession(send, appUrl);
await send("Network.enable");
handlers.set("Fetch.requestPaused", ({ requestId, request }) => {
  let body = { ok: true };
  if (request.url.includes("/api/admin/home-product-order")) {
    const orders = JSON.parse(request.postData ?? "{}").orders;
    const byId = new Map(orders.map((item) => [item.id, item.homeDisplayOrder]));
    storedProducts = storedProducts.map((product) => ({ ...product, homeDisplayOrder: byId.get(product.id) }));
    saveRequests += 1;
    body = { ok: true, products: storedProducts };
  } else if (request.url.includes("/api/admin/hero-slides")) {
    body = { slides: [], settings: {} };
  } else if (request.url.includes("/api/admin/hero-settings")) {
    body = { settings: {} };
  } else if (request.url.includes("/api/site")) {
    body = { settings: {}, products: storedProducts };
  }
  void send("Fetch.fulfillRequest", {
    requestId,
    responseCode: 200,
    responseHeaders: [{ name: "content-type", value: "application/json; charset=utf-8" }],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  });
});
await send("Fetch.enable", { patterns: [
  { urlPattern: "*://*/api/site*" },
  { urlPattern: "*://*/api/admin/hero-slides*" },
  { urlPattern: "*://*/api/admin/hero-settings*" },
  { urlPattern: "*://*/api/admin/home-product-order*" },
] });

const openOrderTab = async () => {
  await waitFor(`(() => {
    const button = document.querySelectorAll(".real-admin-toolbar nav button")[4];
    return button && Object.keys(button).some((key) => key.startsWith("__reactProps"));
  })()`);
  assert.equal(await evaluate(`(() => {
    const button = document.querySelectorAll(".real-admin-toolbar nav button")[4];
    button?.click();
    return Boolean(button);
  })()`), true);
  await waitFor(`document.querySelectorAll(".home-order-category").length === 3`);
};
const categoryIds = (category) => evaluate(`[...document.querySelector('[data-category="${category}"] ol').children]
  .map((item) => Number(item.querySelector('.home-order-position').textContent) && item.querySelector('b').textContent)`);
const moveFirstDown = (category) => evaluate(`(() => {
  const category = document.querySelector('[data-category="${category}"]');
  const button = category.querySelector('li .home-order-actions button:last-child');
  button.click();
  return true;
})()`);

try {
  console.log("browser-check: navigate");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await navigate(`${appUrl}/admin`);
  console.log("browser-check: page", await evaluate(`({ href: location.href, mainClass: document.querySelector("main")?.className, title: document.title })`));
  if (!await evaluate(`Boolean(document.querySelector(".real-admin-page"))`)) {
    assert.ok(adminPassword, "ADMIN_PASSWORD is required when local admin authentication is enabled");
    assert.equal(await evaluate(`(() => {
      const input = document.querySelector('input[name="password"]');
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, ${JSON.stringify(adminPassword)});
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.closest("form").requestSubmit();
      return true;
    })()`), true);
  }
  console.log("browser-check: admin-ready");
  await openOrderTab();
  await waitFor(`document.querySelectorAll(".home-order-category li").length === 6`);
  console.log("browser-check: desktop-order-ready");

  assert.deepEqual(await categoryIds("printers"), ["Epson L3250", "Epson L8050"]);
  assert.deepEqual(await categoryIds("papers"), ["Paper A4", "Photo Paper"]);
  assert.deepEqual(await categoryIds("inks"), ["Ink 001", "Ink 003"]);
  assert.equal(await evaluate(`document.documentElement.dir === "rtl" || document.querySelector("main")?.dir === "rtl"`), true);
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), true);

  for (const category of ["printers", "papers", "inks"]) await moveFirstDown(category);
  assert.deepEqual(await categoryIds("printers"), ["Epson L8050", "Epson L3250"]);
  assert.deepEqual(await categoryIds("papers"), ["Photo Paper", "Paper A4"]);
  assert.deepEqual(await categoryIds("inks"), ["Ink 003", "Ink 001"]);
  await evaluate(`document.querySelector(".home-order-heading button").click()`);
  for (let attempt = 0; attempt < 100 && saveRequests < 1; attempt += 1) await delay(50);
  assert.equal(saveRequests, 1);
  console.log("browser-check: saved");

  await navigate(`${appUrl}/admin`);
  console.log("browser-check: reload-page", await evaluate(`document.querySelector("main")?.className`));
  assert.equal(await evaluate(`Boolean(document.querySelector(".real-admin-page"))`), true);
  await openOrderTab();
  await waitFor(`document.querySelectorAll(".home-order-category li").length === 6`);
  console.log("browser-check: reload-ready");
  assert.deepEqual(await categoryIds("printers"), ["Epson L8050", "Epson L3250"]);
  assert.deepEqual(await categoryIds("papers"), ["Photo Paper", "Paper A4"]);
  assert.deepEqual(await categoryIds("inks"), ["Ink 003", "Ink 001"]);

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(300);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector(".home-order-categories")).gridTemplateColumns.split(" ").length === 1`), true);
  assert.equal(await evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), true);
  console.log("browser-check: mobile-ready");

  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const screenshotDirectory = process.env.SCREENSHOT_DIR ?? path.join(os.tmpdir(), "ishaq-print-browser-tests");
  await mkdir(screenshotDirectory, { recursive: true });
  await writeFile(path.join(screenshotDirectory, "home-product-order-mobile.png"), Buffer.from(screenshot.data, "base64"));
  console.log(JSON.stringify({ desktop: "PASS", mobile: "PASS", rtl: "PASS", reload: "PASS", saveRequests }));
} finally {
  socket.close();
  setTimeout(() => process.exit(), 25).unref();
}
