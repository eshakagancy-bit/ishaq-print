import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://localhost:3102";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9782";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function inspectViewport(width, height) {
  const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
  const version = await fetch(`${cdpBase}/json/version`).then((response) => response.json());
  const socket = new WebSocketClient(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
  const pending = new Map();
  const consoleMessages = [];
  let id = 0;
  let sessionId;
  socket.on("message", (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.method === "Runtime.consoleAPICalled" && ["error", "warning", "warn"].includes(message.params.type)) {
      consoleMessages.push({ type: message.params.type, message: message.params.args.map((argument) => argument.value || argument.description).join(" ") });
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
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (await evaluate(expression)) return;
      await delay(50);
    }
    throw new Error(message);
  };
  const setInput = (value) => evaluate(`(() => { const input=document.querySelector('#global-search-input'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  const setScope = (value) => evaluate(`(() => { const select=document.querySelector('#global-search-scope'); const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; setter.call(select,${JSON.stringify(value)}); select.dispatchEvent(new Event('change',{bubbles:true})); })()`);

  sessionId = (await send("Target.attachToTarget", { targetId: target.id, flatten: true })).sessionId;
  await Promise.all([send("Page.enable"), send("Runtime.enable")]);
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 760, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url: appUrl });
  await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.header-search-button'))", `${width}: app did not load`);
  await delay(250);

  const header = await evaluate(`(() => { const menu=document.querySelector('.menu-btn').getBoundingClientRect(); const logo=document.querySelector('.brand').getBoundingClientRect(); const actions=document.querySelector('.header-left-actions').getBoundingClientRect(); const contentWidth=document.documentElement.clientWidth; return { overflow:document.documentElement.scrollWidth>contentWidth, inlineSearch:Boolean(document.querySelector('.search-panel-wrap,#general-search')), menuRight:menu.left>contentWidth/2, actionsLeft:actions.right<contentWidth/2, logoOffset:Math.abs((logo.left+logo.width/2)-contentWidth/2) }; })()`);
  assert.equal(header.overflow, false, `${width}: document overflow`);
  assert.equal(header.inlineSearch, false, `${width}: inline global search remains`);
  assert.equal(header.menuRight, true, `${width}: menu moved from right`);
  assert.equal(header.actionsLeft, true, `${width}: wishlist/search are not on left`);
  assert.ok(header.logoOffset < 3, `${width}: logo is not centered (${header.logoOffset}px)`);

  await evaluate("document.querySelector('.header-search-button').click()");
  await waitFor("document.querySelector('.menu-overlay').classList.contains('search-open')", `${width}: search drawer did not open`);
  await waitFor("Math.abs(document.querySelector('#search-drawer').getBoundingClientRect().left) < 2", `${width}: drawer animation did not finish`);
  const opened = await evaluate(`(() => { const drawer=document.querySelector('#search-drawer'); const rect=drawer.getBoundingClientRect(); const closeRect=drawer.querySelector('.drawer-close').getBoundingClientRect(); const options=[...document.querySelectorAll('#global-search-scope option')].map(option=>option.textContent.trim()); return { left:Math.round(rect.left), width:Math.round(rect.width), closeLeft:Math.round(closeRect.left), viewport:innerWidth, expanded:document.querySelector('.header-search-button').getAttribute('aria-expanded'), modal:drawer.getAttribute('aria-modal'), scope:document.querySelector('#global-search-scope').value, options, focused:document.activeElement?.id, bodyOverflow:document.body.style.overflow, empty:Boolean(document.querySelector('.search-drawer-state')) }; })()`);
  assert.ok(Math.abs(opened.left) <= 2, `${width}: drawer is not on left (${opened.left}px)`);
  assert.ok(opened.width <= opened.viewport, `${width}: drawer exceeds viewport`);
  assert.ok(opened.closeLeft >= 8, `${width}: close button is clipped (${opened.closeLeft}px)`);
  assert.equal(opened.expanded, "true");
  assert.equal(opened.modal, "true");
  assert.equal(opened.scope, "all");
  assert.deepEqual(opened.options, ["جميع الفئات", "الطابعات", "الأحبار", "الأوراق"]);
  assert.equal(opened.focused, "global-search-input");
  assert.equal(opened.bodyOverflow, "hidden");
  assert.equal(opened.empty, true);

  const categorySamples = await evaluate(`[...document.querySelectorAll('.home-category-section')].map(section => { const card=section.querySelector('.product-card'); return card ? { name:card.querySelector('.product-body h3').textContent.trim(), category:card.dataset.category } : null; }).filter(Boolean)`);
  const verifiedScopes = [];
  for (const sample of categorySamples) {
    await setScope(sample.category);
    await setInput(sample.name);
    await waitFor("document.querySelectorAll('.search-result-item').length > 0", `${width}: ${sample.category} scope returned no real result`);
    const scopeLinks = await evaluate("[...document.querySelectorAll('.search-result-item')].map(link=>link.getAttribute('href'))");
    assert.ok(scopeLinks.every((href) => href.startsWith(`/${sample.category}/`)), `${width}: ${sample.category} scope leaked another category`);
    verifiedScopes.push(sample.category);
  }

  const qaProduct = categorySamples[0];
  const qaQuery = process.env.SEARCH_QUERY || qaProduct.name;
  const qaCategory = process.env.SEARCH_QUERY ? "printers" : qaProduct.category;
  await setScope("all");
  await setInput(qaQuery);
  await waitFor("document.querySelectorAll('.search-result-item').length > 0", `${width}: real product query returned no result`);
  const printerSearch = await evaluate(`(() => ({ count:document.querySelectorAll('.search-result-item').length, links:[...document.querySelectorAll('.search-result-item')].map(link=>link.getAttribute('href')), text:document.querySelector('.search-results-list').innerText }))()`);
  assert.ok(printerSearch.links.every((href) => href.startsWith(`/${qaCategory}/`)), `${width}: search contains wrong category`);
  assert.ok(printerSearch.text.length > 0, `${width}: result text is empty`);

  await setScope(qaCategory === "printers" ? "inks" : "printers");
  await waitFor("Boolean(document.querySelector('.search-drawer-state.no-results'))", `${width}: category scope did not filter result`);
  await setInput("منتج غير موجود حتما");
  assert.equal(await evaluate("Boolean(document.querySelector('.search-drawer-state.no-results'))"), true);

  await evaluate("document.querySelector('.menu-overlay').dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))");
  await waitFor("!document.querySelector('.menu-overlay').classList.contains('open')", `${width}: overlay did not close`);
  await waitFor("document.activeElement?.classList.contains('header-search-button')", `${width}: focus was not restored`);

  await evaluate("document.querySelector('.header-search-button').click()");
  await waitFor("document.querySelector('.menu-overlay').classList.contains('search-open')", `${width}: second open failed`);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
  await waitFor("!document.querySelector('.menu-overlay').classList.contains('open')", `${width}: Escape did not close`);

  await evaluate("document.querySelector('.header-search-button').click()");
  await waitFor("document.querySelector('.menu-overlay').classList.contains('search-open')", `${width}: mutual exclusion setup failed`);
  await evaluate("document.querySelector('.favorite-counter').click()");
  await waitFor("document.querySelector('.menu-overlay').classList.contains('wishlist-open') && !document.querySelector('.menu-overlay').classList.contains('search-open')", `${width}: wishlist did not replace search`);
  await evaluate("document.querySelector('.menu-btn').click()");
  await waitFor("document.querySelector('.menu-overlay').classList.contains('menu-open') && !document.querySelector('.menu-overlay').classList.contains('wishlist-open')", `${width}: menu did not replace wishlist`);
  await evaluate("document.querySelector('#site-menu-drawer .drawer-close').click()");
  await waitFor("!document.querySelector('.menu-overlay').classList.contains('open')", `${width}: menu did not close`);

  await evaluate("document.querySelector('.header-search-button').click()");
  await waitFor("document.querySelector('.menu-overlay').classList.contains('search-open')", `${width}: screenshot open failed`);
  await setScope(qaCategory);
  await setInput(qaQuery.replaceAll("-", " "));
  await waitFor("document.querySelectorAll('.search-result-item').length > 0", `${width}: normalized separator search failed`);
  const screenshot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  const screenshotPath = join(tmpdir(), `ishaq-search-drawer-${width}x${height}.png`);
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  let navigation = null;
  if (width === 1440) {
    navigation = await evaluate("document.querySelector('.search-result-item').getAttribute('href')");
    await evaluate("document.querySelector('.search-result-item').click()");
    await waitFor(`location.pathname === ${JSON.stringify(navigation)}`, "result did not navigate to product details");
  }

  const relevantConsoleMessages = consoleMessages.filter(({ message }) => !message.includes("Download the React DevTools") && !message.includes("eval() is not supported in this environment"));
  assert.deepEqual(relevantConsoleMessages.filter(({ type }) => type === "error"), []);
  socket.close();
  return { width, header, opened, verifiedScopes, printerSearch: { count: printerSearch.count }, navigation, screenshotPath, consoleMessages: relevantConsoleMessages };
}

const results = [];
for (const [width, height] of [[390, 844], [1366, 900], [1440, 1000]]) {
  results.push(await inspectViewport(width, height));
}
console.log(JSON.stringify(results, null, 2));
