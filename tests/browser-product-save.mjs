import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { seedAdminSession } from "./browser-admin-session.mjs";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3000";
const cdpUrl = process.env.CDP_URL ?? process.env.CDP_BASE ?? "http://127.0.0.1:9777";
const marker = " [اختبار حفظ محلي]";
const originalDescription = "وصف اختبار الحفظ المحلي";
let writes = 0;
let products = [{
  id: 910010,
  name: "EPSON WorkForce Pro WF-C5890",
  family: "WorkForce Pro",
  image: "/brand/eshak-logo.png",
  category: "printers",
  printerCategory: "workforce",
  type: "",
  size: "A4",
  description: "طابعة اختبار محلية",
  features: [],
  printerPageContent: {
    detailedDescription: originalDescription,
    productFeatures: [{ title: "ميزة محلية", description: "" }],
    productUses: [{ title: "استخدام محلي", description: "" }],
    whyChooseThisProduct: "سبب محلي",
    faq: [],
  },
}];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const jsonResponse = (requestId, body, responseCode = 200) => send("Fetch.fulfillRequest", {
  requestId,
  responseCode,
  responseHeaders: [{ name: "content-type", value: "application/json; charset=utf-8" }],
  body: Buffer.from(JSON.stringify(body)).toString("base64"),
});

const target = await fetch(`${cdpUrl}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocketClient(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
const pending = new Map();
const consoleErrors = [];
let messageId = 0;
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++messageId;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    consoleErrors.push(message.params.args.map((argument) => argument.value || argument.description).join(" "));
  }
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails?.text || "Runtime exception");
  if (message.method === "Fetch.requestPaused") {
    const { requestId, request } = message.params;
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/site") {
      void jsonResponse(requestId, { settings: {}, products });
    } else if (request.method === "GET" && url.pathname.startsWith("/api/admin/hero-")) {
      void jsonResponse(requestId, { slides: [], settings: {} });
    } else if (["POST", "PATCH"].includes(request.method) && url.pathname === "/api/site") {
      const payload = JSON.parse(request.postData || "{}");
      const product = payload.product;
      const index = products.findIndex((item) => item.id === product.id);
      products = index === -1 ? [...products, product] : products.map((item, position) => position === index ? product : item);
      writes += 1;
      void jsonResponse(requestId, { product }, request.method === "POST" ? 201 : 200);
    } else if (request.method === "DELETE" && url.pathname === "/api/site") {
      const payload = JSON.parse(request.postData || "{}");
      const product = products.find((item) => item.id === payload.id);
      products = products.filter((item) => item.id !== payload.id);
      writes += 1;
      void jsonResponse(requestId, { product });
    } else {
      void send("Fetch.continueRequest", { requestId });
    }
  }
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
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try { if (await evaluate(expression)) return; } catch { /* navigation swaps execution contexts */ }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
};

await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable"), send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*", requestStage: "Request" }] })]);
await seedAdminSession(send, appUrl);
await send("Page.navigate", { url: `${appUrl}/admin` });
await waitFor("Boolean(document.querySelector('.real-admin-page'))");
await waitFor("!document.querySelector('.admin-live-status')?.textContent.includes('جاري تحميل بيانات الموقع')");
await evaluate("[...document.querySelectorAll('.real-admin-toolbar nav button')].find((button) => button.textContent.trim() === 'المنتجات').click()");
await waitFor("document.querySelectorAll('.products-manager article').length === 1");
await evaluate("[...document.querySelectorAll('.products-manager article button')].find((button) => button.textContent.trim() === 'تعديل').click()");
await waitFor("Boolean(document.querySelector('.admin-content-editor textarea'))");

const setDetailedDescription = (value) => evaluate(`(() => {
  const textarea=document.querySelector('.admin-content-editor textarea');
  const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
  setter.call(textarea,${JSON.stringify(value)});
  textarea.dispatchEvent(new Event('input',{bubbles:true}));
  document.querySelector('.product-editor button[type=submit]').click();
  return true;
})()`);

await setDetailedDescription(originalDescription + marker);
for (let attempt = 0; attempt < 150 && writes < 1; attempt += 1) await delay(100);
assert.equal(writes, 1, await evaluate("document.querySelector('.admin-live-status')?.textContent.trim()"));
assert.equal(products[0].printerPageContent.detailedDescription, originalDescription + marker);
await evaluate("[...document.querySelectorAll('.products-manager article button')].find((button) => button.textContent.trim() === 'تعديل').click()");
await waitFor("Boolean(document.querySelector('.admin-content-editor textarea'))");
await setDetailedDescription(originalDescription);
for (let attempt = 0; attempt < 150 && writes < 2; attempt += 1) await delay(100);
assert.equal(writes, 2);
assert.equal(products.length, 1);
assert.equal(products[0].printerPageContent.detailedDescription, originalDescription);
assert.deepEqual(consoleErrors, []);
console.log(JSON.stringify({ rowScopedSave: "PASS", restored: "PASS", products: products.length, writes, externalWrites: 0, consoleErrors }, null, 2));
socket.close();
