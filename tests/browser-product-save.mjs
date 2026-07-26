import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:3012";
const cdpUrl = process.env.CDP_URL ?? "http://127.0.0.1:9778";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPassword = process.env.ADMIN_PASSWORD;
const targetName = "EPSON WorkForce Pro WF-C5890";
const marker = " [اختبار حفظ صف واحد]";
const trialId = Date.now();
const trialName = `منتج تجريبي CRUD ${trialId}`;

assert.ok(supabaseUrl && serviceKey && adminPassword, "Required integration-test environment is missing");

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const semanticHash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const comparableProduct = (product) => {
  const comparable = { ...product };
  delete comparable.updated_at;
  return comparable;
};
const headers = { apikey: serviceKey, authorization: `Bearer ${serviceKey}` };

async function loadProducts() {
  const response = await fetch(`${supabaseUrl}/rest/v1/products?select=*&order=id.asc`, { headers });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function openPage() {
  const target = await fetch(`${cdpUrl}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" })
    .then((response) => response.json());
  const browserVersion = await fetch(`${cdpUrl}/json/version`).then((response) => response.json());
  const socket = new WebSocketClient(browserVersion.webSocketDebuggerUrl);
  const pending = new Map();
  let messageId = 0;
  let sessionId;
  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  socket.on("message", (data) => {
    const message = JSON.parse(data.toString());
    if (!message.id) return;
    const handler = pending.get(message.id);
    if (!handler) return;
    pending.delete(message.id);
    if (message.error) handler.reject(new Error(message.error.message));
    else handler.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
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
  const waitFor = async (expression, timeout = 15_000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      try {
        if (await evaluate(expression)) return;
      } catch {
        // Navigation replaces the execution context.
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
  return { evaluate, navigate, socket, waitFor };
}

async function openTargetEditor(page) {
  assert.equal(await page.evaluate(`(() => {
    const productTab = [...document.querySelectorAll("nav button")].find((button) => button.textContent.trim() === "المنتجات");
    productTab?.click();
    return Boolean(productTab);
  })()`), true);
  await page.waitFor(`document.querySelectorAll(".products-manager article").length === 33`);
  return page.evaluate(`(() => {
    const article = [...document.querySelectorAll(".products-manager article")]
      .find((item) => item.querySelector("b")?.textContent.trim() === ${JSON.stringify(targetName)});
    const editButton = [...(article?.querySelectorAll("button") ?? [])]
      .find((button) => button.textContent.trim() === "تعديل");
    editButton?.click();
    return Boolean(editButton);
  })()`);
}

function saveEditor(page) {
  return page.evaluate(`(() => {
    const button = document.querySelector(".product-editor button[type='submit']");
    button?.click();
    return Boolean(button);
  })()`);
}

const before = await loadProducts();
assert.equal(before.length, 33);
assert.equal(before.filter((product) => ["workforce", "ecotank", "ecotank-6-color", "lq"].includes(product.category)).length, 25);
const original = before.find((product) => product.name === targetName);
assert.ok(original);
assert.equal(typeof original.printer_page_content, "object");
const otherProductsHash = semanticHash(before.filter((product) => product.id !== original.id).map(comparableProduct));
const originalProductsHash = semanticHash(before.map(comparableProduct));

const page = await openPage();
try {
  await page.navigate(`${appUrl}/admin`);
  assert.equal(await page.evaluate(`(() => {
    if (document.querySelector(".real-admin-page")) return true;
    const input = document.querySelector("input[name='password']");
    if (!input) return false;
    input.value = ${JSON.stringify(adminPassword)};
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.closest("form")?.requestSubmit();
    return true;
  })()`), true);
  await page.waitFor(`document.querySelector(".real-admin-page")`);

  const created = await page.evaluate(`fetch("/api/site", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ product: {
      id: ${trialId},
      name: ${JSON.stringify(trialName)},
      family: "",
      image: "/brand/eshak-logo.png",
      category: "electronics",
      type: "",
      size: "",
      description: "منتج تجريبي مؤقت لاختبار الإضافة والحذف",
      features: [],
      sortOrder: 0
    } })
  }).then(async (response) => ({ status: response.status, body: await response.json() }))`);
  assert.equal(created.status, 201);
  assert.equal(created.body.product.id, trialId);

  const afterInsert = await loadProducts();
  assert.equal(afterInsert.length, 34);
  assert.equal(
    semanticHash(afterInsert.filter((product) => product.id !== trialId).map(comparableProduct)),
    originalProductsHash,
  );
  assert.equal(afterInsert.find((product) => product.id === trialId).printer_page_content, null);

  const deleted = await page.evaluate(`fetch("/api/site", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: ${trialId} })
  }).then(async (response) => ({ status: response.status, body: await response.json() }))`);
  assert.equal(deleted.status, 200);
  assert.equal(deleted.body.product.id, trialId);

  const afterDelete = await loadProducts();
  assert.equal(afterDelete.length, 33);
  assert.equal(semanticHash(afterDelete.map(comparableProduct)), originalProductsHash);

  assert.equal(await openTargetEditor(page), true);
  await page.waitFor(`document.querySelector(".product-editor textarea") && document.querySelector(".product-editor").textContent.includes("محتوى صفحة تفاصيل أكثر")`);
  assert.equal(await saveEditor(page), true);
  await page.waitFor(`document.querySelector(".admin-live-status")?.textContent.includes("تم حفظ المنتج بنجاح")`);

  await page.navigate(`${appUrl}/admin`);
  assert.equal(await openTargetEditor(page), true);
  await page.waitFor(`document.querySelector(".admin-content-editor textarea")?.value.length > 0`);
  assert.equal(await page.evaluate(`(() => {
    const textarea = document.querySelector(".admin-content-editor textarea");
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    setValue.call(textarea, textarea.value + ${JSON.stringify(marker)});
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    return textarea.value.endsWith(${JSON.stringify(marker)});
  })()`), true);
  assert.equal(await saveEditor(page), true);
  await page.waitFor(`document.querySelector(".admin-live-status")?.textContent.includes("تم حفظ المنتج بنجاح")`);

  const modified = await loadProducts();
  assert.equal(modified.length, 33);
  assert.equal(semanticHash(modified.filter((product) => product.id !== original.id).map(comparableProduct)), otherProductsHash);
  assert.equal(modified.find((product) => product.id === original.id).printer_page_content.detailedDescription.endsWith(marker), true);

  await page.navigate(`${appUrl}/admin`);
  assert.equal(await openTargetEditor(page), true);
  await page.waitFor(`document.querySelector(".admin-content-editor textarea")?.value.endsWith(${JSON.stringify(marker)})`);
  assert.equal(await page.evaluate(`(() => {
    const textarea = document.querySelector(".admin-content-editor textarea");
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    setValue.call(textarea, textarea.value.slice(0, -${marker.length}));
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    return !textarea.value.endsWith(${JSON.stringify(marker)});
  })()`), true);
  assert.equal(await saveEditor(page), true);
  await page.waitFor(`document.querySelector(".admin-live-status")?.textContent.includes("تم حفظ المنتج بنجاح")`);

  const after = await loadProducts();
  assert.equal(after.length, 33);
  assert.equal(after.filter((product) => ["workforce", "ecotank", "ecotank-6-color", "lq"].includes(product.category)).length, 25);
  assert.equal(semanticHash(after.filter((product) => product.id !== original.id).map(comparableProduct)), otherProductsHash);
  assert.deepEqual(comparableProduct(after.find((product) => product.id === original.id)), comparableProduct(original));
  console.log(JSON.stringify({
    products: after.length,
    printers: 25,
    otherProductsHash,
    originalProductsHash,
    trialCreatedAndDeleted: true,
    targetRestored: true,
  }));
} finally {
  page.socket.close();
}
