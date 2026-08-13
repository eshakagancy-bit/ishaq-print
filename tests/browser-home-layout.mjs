import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9778";
const artifacts = new URL("../test-artifacts/", import.meta.url);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function inspectViewport(width, height) {
  const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
  const version = await fetch(`${cdpBase}/json/version`).then((response) => response.json());
  const socket = new WebSocketClient(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
  const pending = new Map();
  const consoleErrors = [];
  let id = 0;
  let sessionId;
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
    socket.send(JSON.stringify({ id: messageId, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  sessionId = (await send("Target.attachToTarget", { targetId: target.id, flatten: true })).sessionId;
  await Promise.all([send("Page.enable"), send("Runtime.enable")]);
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 760, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url: appUrl });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('.products-section .product-card'))")) break;
    await delay(100);
  }
  await delay(500);
  const metrics = await evaluate(`(() => {
    const container = document.querySelector('.products-section>.container').getBoundingClientRect();
    const search = document.querySelector('.search-panel').getBoundingClientRect();
    const slider = document.querySelector('.home-category-section .product-grid');
    const activeGroup = slider.querySelector('.product-group');
    const cards = [...activeGroup.querySelectorAll('.product-card')].map((card) => card.getBoundingClientRect());
    const productIds = [...document.querySelectorAll('.home-category-section .product-card')].map((card) => card.dataset.productId);
    const uniqueRows = [...new Set(cards.map((card) => Math.round(card.top)))];
    const uniqueColumns = [...new Set(cards.map((card) => Math.round(card.left)))];
    return {
      viewport: innerWidth,
      layoutViewport: document.documentElement.clientWidth,
      containerWidth: Math.round(container.width),
      containerLeft: Math.round(container.left),
      searchAligned: Math.abs(search.left - container.left) <= 1 && Math.abs(search.right - container.right) <= 1,
      cardWidth: Math.round(cards[0]?.width || 0),
      rows: uniqueRows.length,
      columns: uniqueColumns.length,
      productCardCount: productIds.length,
      uniqueProductCount: new Set(productIds).size,
      duplicateResponsiveWrappers: document.querySelectorAll('.home-category-desktop-products,.home-category-mobile-products').length,
      configuredGroupSize: Number(slider.dataset.productGroupSize),
      groupSizes: [...slider.querySelectorAll(':scope > .product-group')].map((group) => group.querySelectorAll(':scope > .product-card').length),
      mobileSnap: getComputedStyle(slider).scrollSnapType,
      documentOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  })()`);
  if (width === 1920) {
    const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true });
    await mkdir(artifacts, { recursive: true });
    await writeFile(new URL("home-desktop-1920x1080-full.png", artifacts), Buffer.from(screenshot.data, "base64"));
  }
  assert.equal(metrics.documentOverflow, false, `${width}: horizontal document overflow`);
  assert.equal(metrics.searchAligned, true, `${width}: search and products are not aligned`);
  assert.equal(metrics.productCardCount, metrics.uniqueProductCount, `${width}: product cards must appear once in the DOM`);
  assert.equal(metrics.duplicateResponsiveWrappers, 0, `${width}: legacy responsive slider copies must not exist`);
  if (width > 760) {
    assert.equal(metrics.containerWidth, Math.min(metrics.layoutViewport - 48, 1440));
    assert.equal(metrics.columns, 4);
    assert.ok(metrics.rows <= 2);
    assert.equal(metrics.configuredGroupSize, 8);
    assert.ok(metrics.groupSizes.every((count) => count <= 8));
  } else {
    assert.equal(metrics.containerWidth, metrics.layoutViewport - 28);
    assert.equal(metrics.columns, 3);
    assert.ok(metrics.rows <= 2);
    assert.equal(metrics.configuredGroupSize, 6);
    assert.ok(metrics.groupSizes.every((count) => count <= 6));
    assert.match(metrics.mobileSnap, /x/);
  }
  assert.deepEqual(consoleErrors, []);
  socket.close();
  return metrics;
}

const results = [];
for (const [width, height] of [[390, 844], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440]]) results.push(await inspectViewport(width, height));
console.log(JSON.stringify(results, null, 2));
