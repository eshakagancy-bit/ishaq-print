import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://localhost:3010";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9778";
const artifacts = new URL("../test-artifacts/", import.meta.url);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runViewport(name, width, height, mobile) {
  const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
  const version = await fetch(`${cdpBase}/json/version`).then((response) => response.json());
  const socket = new WebSocketClient(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
  const pending = new Map();
  const consoleErrors = [];
  const imageWidths = [];
  let id = 0;
  let sessionId;
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push(message.params.args.map((arg) => arg.value || arg.description).join(" "));
    if (message.method === "Network.requestWillBeSent" && message.params.type === "Image") {
      const requestedWidth = new URL(message.params.request.url).searchParams.get("w");
      if (requestedWidth) imageWidths.push(Number(requestedWidth));
    }
    if (!message.id) return;
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(message.error.message));
    else handler.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    socket.send(JSON.stringify({ id: messageId, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try { if (await evaluate(expression)) return; } catch {}
      await delay(100);
    }
    throw new Error(`Timeout: ${expression}\nConsole: ${consoleErrors.join("\n")}`);
  };
  const screenshot = async (file) => {
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await mkdir(artifacts, { recursive: true });
    await writeFile(new URL(file, artifacts), Buffer.from(shot.data, "base64"));
  };

  sessionId = (await send("Target.attachToTarget", { targetId: target.id, flatten: true })).sessionId;
  await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable")]);
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url: appUrl });
  await waitFor("document.readyState === 'complete' && document.querySelectorAll('.product-card').length > 0");
  await delay(800);

  const layout = await evaluate(`(() => {
    const header = document.querySelector('.header').getBoundingClientRect();
    const hero = document.querySelector('#home').getBoundingClientRect();
    return { headerBottom: header.bottom, heroTop: hero.top, direction: getComputedStyle(document.querySelector('main')).direction };
  })()`);
  assert.equal(layout.direction, "rtl");
  assert.ok(layout.heroTop >= layout.headerBottom - 1, `${name}: header overlaps hero`);

  await evaluate("document.querySelector('.product-card[data-category=\"printers\"] .quick-view').scrollIntoView({block:'center'})");
  await delay(300);
  await evaluate("document.querySelector('.product-card[data-category=\"printers\"] .quick-view').click()");
  await waitFor("Boolean(document.querySelector('.product-modal-shell'))");
  const modal = await evaluate(`(() => {
    const shell = document.querySelector('.product-modal-shell').getBoundingClientRect();
    const image = document.querySelector('.modal-image').getBoundingClientRect();
    const close = document.querySelector('.modal-close').getBoundingClientRect();
    return { top:shell.top,bottom:shell.bottom,imageHeight:image.height,closeLeft:close.left,closeTop:close.top,hasQuote:[...document.querySelectorAll('.modal-content a')].some((a)=>a.textContent.includes('السعر والتوفر')) };
  })()`);
  assert.ok(modal.top >= 0 && modal.bottom <= height + 1, `${name}: modal outside viewport`);
  assert.ok(modal.closeLeft >= 10 && modal.closeTop >= 10, `${name}: close button touches edge`);
  if (mobile) assert.ok(modal.imageHeight <= 260, `${name}: modal image too tall`);
  assert.equal(modal.hasQuote, true);
  await screenshot(`ux-fixes-${name}-modal.png`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await waitFor("!document.querySelector('.product-modal-shell')");

  await evaluate("document.querySelector('.header-search-button').click()");
  await waitFor("document.querySelector('.menu-overlay').classList.contains('search-open')");
  await evaluate(`(() => { const input=document.querySelector('#global-search-input'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'missing-product-for-browser-check'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await waitFor("Boolean(document.querySelector('.search-drawer-state.no-results'))");
  await screenshot(`ux-fixes-${name}-empty-search.png`);
  await evaluate("document.querySelector('.global-search-field button').click()");
  await waitFor("Boolean(document.querySelector('.search-drawer-state:not(.no-results)'))");
  await evaluate("document.querySelector('#search-drawer .drawer-close').click()");
  await waitFor("!document.querySelector('.menu-overlay').classList.contains('open')");

  await evaluate("document.querySelector('footer').scrollIntoView({ block: 'end', behavior: 'instant' })");
  await delay(500);
  const footerVisible = await evaluate(`(() => { const footer=document.querySelector('footer').getBoundingClientRect(); return footer.top < innerHeight && footer.bottom > 0; })()`);
  assert.equal(footerVisible, true, `${name}: footer not reachable`);
  assert.deepEqual(consoleErrors, [], `${name}: console errors`);
  if (mobile) assert.ok(Math.max(0, ...imageWidths) <= 1080, `${name}: oversized mobile image request ${Math.max(...imageWidths)}`);
  socket.close();
}

await runViewport("mobile", 390, 844, true);
await runViewport("desktop", 1440, 900, false);
console.log("UX browser checks passed on mobile and desktop");
