import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://localhost:3100";
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
    socket.send(JSON.stringify({ id: messageId, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.result.description || result.exceptionDetails.text);
    return result.result.value;
  };

  sessionId = (await send("Target.attachToTarget", { targetId: target.id, flatten: true })).sessionId;
  await Promise.all([send("Page.enable"), send("Runtime.enable")]);
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 760, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url: appUrl });
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('.home-category-products .product-card'))")) break;
    await delay(100);
  }
  await delay(700);

  const metrics = await evaluate(`(() => ({
    viewport: innerWidth,
    documentOverflow: document.documentElement.scrollWidth > innerWidth,
    emptySections: document.querySelectorAll('.home-category-empty').length,
    sections: [...document.querySelectorAll('.home-category-products')].map((rail) => {
      const railRect = rail.getBoundingClientRect();
      const cards = [...rail.querySelectorAll(':scope > .product-card')];
      const cardRects = cards.map((card) => card.getBoundingClientRect());
      const styles = getComputedStyle(rail);
      return {
        id: rail.closest('.home-category-section').id,
        count: cards.length,
        display: styles.display,
        wrap: styles.flexWrap,
        overflowX: styles.overflowX,
        snap: styles.scrollSnapType,
        touchAction: styles.touchAction,
        rows: new Set(cardRects.map((rect) => Math.round(rect.top))).size,
        cardWidth: Math.round(cardRects[0]?.width || 0),
        fullyVisible: cardRects.filter((rect) => rect.left >= railRect.left - 1 && rect.right <= railRect.right + 1).length,
        scrollable: rail.scrollWidth > rail.clientWidth,
        controls: rail.closest('.home-category-section').querySelectorAll('.product-group-controls,.carousel-arrow,.pagination').length,
        commercialFooters: rail.querySelectorAll('.product-footer,.price').length,
      };
    }),
  }))()`);

  assert.equal(metrics.documentOverflow, false, `${width}: horizontal document overflow`);
  assert.ok(metrics.sections.length >= 1, `${width}: no populated homepage product strips`);
  for (const section of metrics.sections) {
    assert.equal(section.display, "flex", `${width} ${section.id}: flex rail`);
    assert.equal(section.wrap, "nowrap", `${width} ${section.id}: wrapping`);
    assert.equal(section.overflowX, "auto", `${width} ${section.id}: native horizontal overflow`);
    assert.equal(section.rows, 1, `${width} ${section.id}: second row`);
    assert.equal(section.scrollable, true, `${width} ${section.id}: no off-screen products`);
    assert.equal(section.controls, 0, `${width} ${section.id}: old controls remain`);
    assert.equal(section.commercialFooters, 0, `${width} ${section.id}: commercial footer remains`);
    assert.match(section.snap, /x/, `${width} ${section.id}: scroll snap`);
    assert.match(section.touchAction, /pan-x/, `${width} ${section.id}: touch scrolling`);
    if (width > 760) assert.ok(section.fullyVisible >= 5 && section.fullyVisible <= 7, `${width} ${section.id}: desktop density`);
    else assert.equal(section.fullyVisible, 1, `${width} ${section.id}: mobile peek density`);
  }

  await evaluate("scrollTo(0, document.querySelector('.home-category-section').getBoundingClientRect().top + scrollY - 72)");
  await delay(250);
  const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  await mkdir(artifacts, { recursive: true });
  await writeFile(new URL(`home-carousel-${width}x${height}.png`, artifacts), Buffer.from(screenshot.data, "base64"));

  let interaction = null;
  if (width === 1440) {
    const point = await evaluate(`(() => {
      const rail = document.querySelector('.home-category-products');
      rail.scrollLeft = 0;
      const rect = rail.querySelectorAll(':scope > .product-card')[2].getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height * .35, url: location.href };
    })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", buttons: 1, clickCount: 1 });
    for (const distance of [40, 90, 150, 210]) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x + distance, y: point.y, button: "left", buttons: 1 });
    }
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x + 210, y: point.y, button: "left", buttons: 0, clickCount: 1 });
    await delay(150);
    interaction = await evaluate(`(() => {
      const rail = document.querySelector('.home-category-products');
      return { scrollLeft: rail.scrollLeft, url: location.href, modal: Boolean(document.querySelector('.product-modal-shell')), dragging: rail.classList.contains('is-dragging') };
    })()`);
    assert.ok(Math.abs(interaction.scrollLeft) > 100, "desktop mouse drag did not scroll");
    assert.equal(interaction.url, point.url, "drag caused accidental product navigation");
    assert.equal(interaction.modal, false, "drag opened Quick View");
    assert.equal(interaction.dragging, false, "drag state did not clear");

    const favoritePoint = await evaluate(`(() => {
      const rail = document.querySelector('.home-category-products');
      rail.scrollLeft = 0;
      const button = rail.querySelector('.heart');
      const rect = button.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, pressed: button.getAttribute('aria-pressed') };
    })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: favoritePoint.x, y: favoritePoint.y });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: favoritePoint.x, y: favoritePoint.y, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: favoritePoint.x, y: favoritePoint.y, button: "left", buttons: 0, clickCount: 1 });
    await delay(100);
    interaction.favoritePressed = await evaluate("document.querySelector('.home-category-products .heart').getAttribute('aria-pressed')");
    assert.notEqual(interaction.favoritePressed, favoritePoint.pressed, "favorite button did not toggle");

    const quickViewPoint = await evaluate(`(() => {
      const button = document.querySelector('.home-category-products .quick-view');
      const rect = button.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: quickViewPoint.x, y: quickViewPoint.y });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: quickViewPoint.x, y: quickViewPoint.y, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: quickViewPoint.x, y: quickViewPoint.y, button: "left", buttons: 0, clickCount: 1 });
    await delay(100);
    interaction.quickView = await evaluate("Boolean(document.querySelector('.product-modal-shell'))");
    assert.equal(interaction.quickView, true, "Quick View did not open");
    await evaluate("document.querySelector('.product-modal-shell .modal-close').click()");
    await delay(100);

    const productPoint = await evaluate(`(() => {
      const link = document.querySelector('.home-category-products .product-card-link');
      return { href: link.href, label: link.getAttribute('aria-label') };
    })()`);
    assert.ok(productPoint.label, "product details link has no accessible name");
    await send("Page.navigate", { url: productPoint.href });
    for (let attempt = 0; attempt < 100 && await evaluate("location.href") !== productPoint.href; attempt += 1) await delay(50);
    interaction.productUrl = await evaluate("location.href");
    assert.equal(interaction.productUrl, productPoint.href, "product details route did not open");
  }

  const relevantConsoleErrors = consoleErrors.filter((message) => !message.includes("eval() is not supported in this environment"));
  assert.deepEqual(relevantConsoleErrors, []);
  socket.close();
  return { ...metrics, interaction, consoleErrors: relevantConsoleErrors };
}

const results = [];
for (const [width, height] of [[390, 844], [1366, 900], [1440, 1000], [1920, 1080]]) {
  results.push(await inspectViewport(width, height));
}
console.log(JSON.stringify(results, null, 2));
