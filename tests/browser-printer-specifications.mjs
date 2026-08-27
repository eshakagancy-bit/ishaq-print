import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { getPrinterSlug } from "../app/printers/product-slug.ts";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const publicAppUrl = process.env.PUBLIC_APP_URL || "https://ishaq-print-zeta.vercel.app";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9777";
const artifactsDirectory = new URL("../test-artifacts/", import.meta.url);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const normalizedModel = (value) => String(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
const matchesModel = (name, model) => normalizedModel(name).endsWith(normalizedModel(model));

const siteResponse = await fetch(`${publicAppUrl}/api/site?specAudit=1`);
assert.equal(siteResponse.ok, true, "unable to load the public printer catalog");
const siteData = await siteResponse.json();
const printers = siteData.products.filter((product) => product.category === "printers");
assert.ok(printers.length > 0, "the public printer catalog must not be empty");

const stableModels = ["L3160", "L15180", "L6290", "L14150", "WF-C529R", "WF-M5799DWF"];
const duplicateTolerantModels = ["L4360", "L3266"];
const stableProducts = stableModels.map((model) => {
  const matches = printers.filter((product) => matchesModel(product.name, model));
  assert.ok(matches.length >= 1, `${model}: public product missing`);
  assert.ok(matches.every((product) => product.specifications && typeof product.specifications === "object"), `${model}: specifications missing`);
  return matches[0];
});
for (const model of duplicateTolerantModels) {
  const matches = printers.filter((product) => matchesModel(product.name, model));
  assert.ok(matches.length >= 1, `${model}: public product missing`);
  assert.ok(matches.every((product) => product.specifications && typeof product.specifications === "object"), `${model}: one matching record lacks specifications`);
}

const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocketClient(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
const pending = new Map();
const consoleErrors = [];
const pageErrors = [];
const networkErrors = [];
let id = 0;
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const messageId = ++id;
  pending.set(messageId, { resolve, reject });
  socket.send(JSON.stringify({ id: messageId, method, params }));
});
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push(message.params.args.map((argument) => argument.value || argument.description).join(" "));
  if (message.method === "Runtime.exceptionThrown") pageErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || "Runtime exception");
  if (message.method === "Network.responseReceived" && message.params.response.status >= 400) networkErrors.push(`${message.params.response.status} ${message.params.response.url}`);
  if (!message.id) return;
  const handler = pending.get(message.id);
  if (!handler) return;
  pending.delete(message.id);
  if (message.error) handler.reject(new Error(message.error.message)); else handler.resolve(message.result);
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 600; attempt += 1) {
    try { if (await evaluate(expression)) return; } catch { /* navigation swaps contexts */ }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
};
const navigate = async (url, width, height) => {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 390, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url });
  await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.printer-summary h1'))");
};
const screenshot = async (name) => {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await mkdir(artifactsDirectory, { recursive: true });
  await writeFile(new URL(name, artifactsDirectory), Buffer.from(result.data, "base64"));
};

await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable")]);
const viewports = [
  { name: "desktop-1440", width: 1440, height: 1000 },
  { name: "desktop-1366", width: 1366, height: 900 },
  { name: "mobile-390", width: 390, height: 844 },
];
const results = [];
for (const viewport of viewports) {
  for (const product of stableProducts) {
    const path = `/printers/${getPrinterSlug(product)}`;
    await navigate(`${publicAppUrl}${path}`, viewport.width, viewport.height);
    const state = await evaluate(`(() => ({
      path: location.pathname,
      title: document.querySelector('.printer-summary h1')?.textContent?.trim(),
      imageLoaded: [...document.querySelectorAll('.product-gallery img')].some((image) => image.complete && image.naturalWidth > 0),
      specificationRows: document.querySelectorAll('.printer-key-info > div,.printer-spec-table tr').length,
      sectionLinks: document.querySelectorAll('.product-section-nav a').length,
      descriptionParagraphs: document.querySelectorAll('#description p').length,
      featureCards: document.querySelectorAll('#features article').length,
      useCards: document.querySelectorAll('#uses article').length,
      whyChooseParagraphs: document.querySelectorAll('#why-product p').length,
      faqItems: document.querySelectorAll('#faq details').length,
      arabicCharacters: (document.body.innerText.match(/[\u0600-\u06FF]/g) || []).length,
      suspiciousQuestionMarkSequences: (document.body.innerText.match(/\\?{3,}/g) || []).length,
      direction: getComputedStyle(document.body).direction,
      hasUndefined: /(^|\\s)undefined($|\\s)/i.test(document.body.innerText),
      hasNull: /(^|\\s)null($|\\s)/i.test(document.body.innerText),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      backLink: new URL(document.querySelector('.printer-back-link').href).pathname,
      searchButton: Boolean(document.querySelector('button[aria-label="فتح البحث"]')),
    }))()`);
    assert.equal(state.path, path);
    assert.equal(state.title, product.name);
    assert.equal(state.imageLoaded, true, `${product.name}: image did not load`);
    assert.ok(state.specificationRows > 0, `${product.name}: specifications are not visible`);
    assert.equal(state.sectionLinks, 6, `${product.name}: all six content tabs must be visible`);
    assert.ok(state.descriptionParagraphs >= 3, `${product.name}: detailed description quality`);
    assert.ok(state.featureCards >= 5 && state.featureCards <= 7, `${product.name}: feature content quality`);
    assert.ok(state.useCards >= 4 && state.useCards <= 6, `${product.name}: use content quality`);
    assert.ok(state.whyChooseParagraphs >= 2, `${product.name}: why-choose content quality`);
    assert.ok(state.faqItems >= 5 && state.faqItems <= 7, `${product.name}: FAQ content quality`);
    assert.ok(state.arabicCharacters > 100, `${product.name}: Arabic content must render`);
    assert.equal(state.suspiciousQuestionMarkSequences, 0, `${product.name}: corrupted question marks are visible`);
    assert.equal(state.direction, "rtl", `${product.name}: page direction must be RTL`);
    assert.equal(state.hasUndefined, false, `${product.name}: undefined is visible`);
    assert.equal(state.hasNull, false, `${product.name}: null is visible`);
    assert.equal(state.overflow, false, `${product.name}: ${viewport.name} horizontal overflow`);
    assert.equal(state.backLink, "/printers");
    assert.equal(state.searchButton, true);
    await evaluate("document.querySelector('#faq details summary').click()");
    assert.equal(await evaluate("document.querySelector('#faq details').open"), true, `${product.name}: FAQ interaction`);
    await evaluate("document.querySelector('button[aria-label=\"فتح البحث\"]').click()");
    await waitFor("document.querySelector('#search-drawer')?.getAttribute('aria-modal') === 'true'");
    await evaluate("document.querySelector('#search-drawer button[aria-label=\"إغلاق البحث\"]').click()");
    await waitFor("document.querySelector('#search-drawer')?.getAttribute('aria-hidden') === 'true'");
    results.push({ model: product.name, viewport: viewport.name, tabs: state.sectionLinks, faq: "PASS", rtl: state.direction, status: "PASS" });
    await screenshot(`printer-arabic-${normalizedModel(product.name)}-${viewport.name}.png`);
  }
  await screenshot(`printer-specifications-${viewport.name}.png`);
}

assert.deepEqual(consoleErrors, []);
assert.deepEqual(pageErrors, []);
assert.deepEqual(networkErrors, []);
console.log(JSON.stringify({ products: stableProducts.map((product) => product.name), duplicateTolerantModels, results, consoleErrors, pageErrors, networkErrors }, null, 2));
socket.close();
