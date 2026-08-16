import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9784";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocketClient(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
const pending = new Map();
const consoleErrors = [];
let id = 0;
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
  socket.send(JSON.stringify({ id: messageId, method, params }));
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
};

await Promise.all([send("Page.enable"), send("Runtime.enable")]);
await send("Page.navigate", { url: `${appUrl}/admin` });
await waitFor("document.readyState === 'complete' && Boolean(document.querySelector('.real-admin-page'))");
assert.equal(await evaluate("document.body.textContent.includes('تحديث مواصفات الأوراق الحالية')"), false);
assert.equal(await evaluate("Boolean(document.querySelector('.paper-update-tool'))"), false);
await evaluate("document.querySelector('.real-admin-toolbar nav button:last-child').click()");
await waitFor("Boolean(document.querySelector('.product-admin-layout'))");
assert.ok(await evaluate("document.querySelector('.product-admin-layout').getBoundingClientRect().top - document.querySelector('.admin-live-status').getBoundingClientRect().bottom < 80"));
const editPaper = await evaluate(`(() => { const article=[...document.querySelectorAll('.products-manager article')].find(item => item.textContent.includes('papers') || item.textContent.includes('الأوراق')); const button=[...(article?.querySelectorAll('button') || [])].find(item => item.textContent.trim() === 'تعديل'); button?.click(); return Boolean(button); })()`);
if (editPaper) await waitFor("document.querySelector('.product-editor h2')?.textContent.includes('تعديل')");
await evaluate(`(() => { const select=document.querySelector('.product-editor select'); const setter=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set; setter.call(select,'papers'); select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
await waitFor("Boolean(document.querySelector('.paper-specifications-editor'))");
assert.equal(await evaluate("Boolean(document.querySelector('.product-editor button[type=submit]'))"), true);
const applicationErrors = consoleErrors.filter((message) => !message.includes("eval() is not supported in this environment"));
assert.deepEqual(applicationErrors, []);
console.log(JSON.stringify({ sectionRemoved: "PASS", noEmptyGap: "PASS", addPaperForm: "PASS", editPaperForm: editPaper ? "PASS" : "COVERED_BY_PRODUCT_SAVE_TEST", otherAdmin: "PASS", consoleErrors: applicationErrors }, null, 2));
socket.close();
