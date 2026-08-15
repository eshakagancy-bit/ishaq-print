import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://localhost:3104";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9782";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function inspectViewport(width, height) {
  const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
  const version = await fetch(`${cdpBase}/json/version`).then((response) => response.json());
  const socket = new WebSocketClient(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });

  const pending = new Map();
  const consoleMessages = [];
  const failedResponses = [];
  let id = 0;
  let sessionId;
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.method === "Runtime.consoleAPICalled" && ["error", "warning", "warn"].includes(message.params.type)) {
      consoleMessages.push(message.params.args.map((argument) => argument.value || argument.description).join(" "));
    }
    if (message.method === "Network.responseReceived" && message.params.response.status >= 400) {
      failedResponses.push({ status: message.params.response.status, url: message.params.response.url });
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
  const waitFor = async (expression, message) => {
    for (let attempt = 0; attempt < 240; attempt += 1) {
      if (await evaluate(expression)) return;
      await delay(50);
    }
    throw new Error(message);
  };

  sessionId = (await send("Target.attachToTarget", { targetId: target.id, flatten: true })).sessionId;
  await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable")]);
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 760, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url: appUrl });
  await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.menu-btn'))", `${width}: homepage did not load`);

  const home = await evaluate(`(() => ({
    path:location.pathname,
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
    oldMaintenance:Boolean(document.querySelector('.maintenance-hero,#maintenance')),
    dedicatedMaintenance:Boolean(document.querySelector('.maintenance-page')),
    footer:Boolean(document.querySelector('footer'))
  }))()`);
  assert.deepEqual(home, { path: "/", overflow: false, oldMaintenance: false, dedicatedMaintenance: false, footer: true });

  await evaluate("document.querySelector('.menu-btn').click()");
  await waitFor("document.querySelector('.menu-overlay').classList.contains('menu-open')", `${width}: menu did not open`);
  const menuLink = await evaluate(`(() => { const link=document.querySelector('#site-menu-drawer a[href="/maintenance"]'); return link && { text:link.textContent.trim(), current:link.getAttribute('aria-current') }; })()`);
  assert.deepEqual(menuLink, { text: "الصيانة والدعم الفني", current: null });
  await evaluate("document.querySelector('#site-menu-drawer a[href=\"/maintenance\"]').click()");
  await waitFor("location.pathname === '/maintenance' && Boolean(document.querySelector('.maintenance-page'))", `${width}: maintenance navigation failed`);
  await waitFor("!document.querySelector('.menu-overlay').classList.contains('open')", `${width}: menu remained open after navigation`);

  const maintenance = await evaluate(`(() => ({
    overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
    h1:[...document.querySelectorAll('h1')].map((item)=>item.textContent.trim()),
    hero:Boolean(document.querySelector('.maintenance-page-hero')),
    services:[...document.querySelectorAll('.maintenance-service-list h3')].map((item)=>item.textContent.trim()),
    numbers:[...document.querySelectorAll('.maintenance-card strong')].map((item)=>item.textContent.trim()),
    tel:[...document.querySelectorAll('.maintenance-call')].map((item)=>item.getAttribute('href')),
    whatsapp:[...document.querySelectorAll('.maintenance-whatsapp')].map((item)=>item.getAttribute('href')),
    shell:['header','footer','#wishlist-drawer','#search-drawer'].every((selector)=>Boolean(document.querySelector(selector))),
    bodyOverflow:document.body.style.overflow
  }))()`);
  assert.equal(maintenance.overflow, false, `${width}: maintenance page overflows horizontally`);
  assert.deepEqual(maintenance.h1, ["الصيانة والدعم الفني"]);
  assert.equal(maintenance.hero, true);
  assert.deepEqual(maintenance.services, ["فحص الأعطال", "صيانة ودعم فني", "متابعة سريعة"]);
  assert.deepEqual(maintenance.numbers, ["777103838", "781103838"]);
  assert.deepEqual(maintenance.tel, ["tel:+967777103838", "tel:+967781103838"]);
  assert.ok(maintenance.whatsapp[0].startsWith("https://wa.me/967777103838?text="));
  assert.ok(maintenance.whatsapp[1].startsWith("https://wa.me/967781103838?text="));
  assert.equal(maintenance.shell, true);
  assert.equal(maintenance.bodyOverflow, "");

  await evaluate("document.querySelector('.menu-btn').click()");
  await waitFor("document.querySelector('.menu-overlay').classList.contains('menu-open')", `${width}: maintenance menu did not open`);
  assert.equal(await evaluate("document.querySelector('#site-menu-drawer a[href=\"/maintenance\"]').getAttribute('aria-current')"), "page");
  await evaluate("document.querySelector('#site-menu-drawer .drawer-close').click()");
  await waitFor("!document.querySelector('.menu-overlay').classList.contains('open')", `${width}: close button failed`);

  const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true });
  const screenshotPath = join(tmpdir(), `ishaq-maintenance-${width}x${height}.png`);
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  const relevantConsoleMessages = consoleMessages.filter((message) => !message.includes("Download the React DevTools"));
  assert.deepEqual(relevantConsoleMessages, []);
  assert.deepEqual(failedResponses, []);
  socket.close();
  return { width, home, maintenance: { h1: maintenance.h1, services: maintenance.services, numbers: maintenance.numbers }, screenshotPath, consoleMessages: relevantConsoleMessages, failedResponses };
}

const results = [];
for (const [width, height] of [[390, 844], [1366, 900], [1440, 1000]]) {
  results.push(await inspectViewport(width, height));
}
console.log(JSON.stringify(results, null, 2));
