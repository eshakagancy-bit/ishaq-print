import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { ALL_PRINTERS_FILTER, PRINTER_CATEGORIES } from "../app/printer-categories.ts";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const cdpBase = "http://127.0.0.1:9777";
const artifactsDirectory = new URL("../test-artifacts/", import.meta.url);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function openPage(url, mockedSiteData) {
  const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
  const browserVersion = await fetch(`${cdpBase}/json/version`).then((response) => response.json());
  const socket = new WebSocketClient(browserVersion.webSocketDebuggerUrl);
  const pending = new Map();
  const eventHandlers = new Map();
  let messageId = 0;
  let sessionId;

  await new Promise((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  socket.on("message", (data) => {
    const message = JSON.parse(data.toString());
    if (!message.id) {
      eventHandlers.get(message.method)?.(message.params);
      return;
    }
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
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression, timeout = 12_000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      try {
        if (await evaluate(expression)) return;
      } catch {
        // Navigation can replace the execution context while polling.
      }
      await delay(100);
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  };
  const navigate = async (nextUrl) => {
    await send("Page.navigate", { url: nextUrl });
    await waitFor(`location.href.startsWith(${JSON.stringify(nextUrl)}) && document.readyState === "complete"`);
  };
  const screenshot = async (name) => {
    const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await mkdir(artifactsDirectory, { recursive: true });
    await writeFile(new URL(name, artifactsDirectory), Buffer.from(result.data, "base64"));
  };

  sessionId = (await send("Target.attachToTarget", { targetId: target.id, flatten: true })).sessionId;
  await send("Page.enable");
  await send("Runtime.enable");
  if (mockedSiteData) {
    eventHandlers.set("Fetch.requestPaused", ({ requestId }) => {
      void send("Fetch.fulfillRequest", {
        requestId,
        responseCode: 200,
        responseHeaders: [{ name: "content-type", value: "application/json; charset=utf-8" }],
        body: Buffer.from(JSON.stringify(mockedSiteData)).toString("base64"),
      });
    });
    await send("Fetch.enable", { patterns: [{ urlPattern: "*://127.0.0.1:3000/api/site*" }] });
  }
  await navigate(url);
  return { evaluate, navigate, screenshot, send, socket, waitFor };
}

const liveData = await fetch("https://ishaq-print-zeta.vercel.app/api/site?specAudit=1").then((response) => response.json());
const livePrinters = liveData.products.filter((product) => product.category === "printers");
const liveCounts = Object.fromEntries([
  ["all", livePrinters.length],
  ...PRINTER_CATEGORIES.map((category) => [category.value, livePrinters.filter((product) => product.printerCategory === category.value).length]),
]);
assert.deepEqual(liveCounts, { all: 25, workforce: 12, ecotank: 7, "ecotank-6-color": 3, lq: 3 });

const localTestData = structuredClone(liveData);
const lq350 = localTestData.products.find((product) => product.name === "LQ-350");
assert.ok(lq350, "LQ-350 must exist in the read-only source data");
Object.assign(lq350, {
  family: "Epson LQ",
  size: "ورق متصل 80 عمود",
  type: "طابعة نقطية",
  description: "طابعة نقطية مدمجة وموثوقة لطباعة الفواتير والسندات والورق المتصل، مناسبة للمكاتب ونقاط العمل اليومية.",
  specifications: {
    paperSize: "ورق متصل 80 عمود", printerType: "طابعة نقطية", functions: ["طباعة"],
    printTechnology: "مصفوفة نقطية تصادمية، 24 إبرة", colorCount: 1, colorMode: "أحادي اللون",
    wifi: false, ethernet: false, usb: true, parallel: true, serial: true, optionalInterface: false,
    scanner: false, fax: false, duplex: false, adf: false, adfCapacity: null,
    printSpeed: 347, speedUnit: "حرف/ثانية", inkType: "شريط طباعة", borderless: false,
    mobilePrinting: false, usage: ["مكتبي", "فواتير وسندات"], dotMatrixPins: 24,
    printColumns: 80, multipartCopies: 3, ribbonYield: 2500000,
  },
});

const page = await openPage("http://127.0.0.1:3000", localTestData);
await page.waitFor("document.querySelectorAll('.filters button').length === 5");
const expectedLabels = [ALL_PRINTERS_FILTER.label, ...PRINTER_CATEGORIES.map((category) => category.label)];
assert.deepEqual(
  await page.evaluate("[...document.querySelectorAll('.filters button')].map((button) => button.textContent.trim())"),
  expectedLabels,
);
assert.equal(await page.evaluate("getComputedStyle(document.body).direction"), "rtl");

const injectedLocalProducts = await page.evaluate(`(() => {
  const products = ${JSON.stringify(localTestData.products)};
  const element = document.querySelector('.product-grid');
  const fiberKey = element && Object.keys(element).find((key) => key.startsWith('__reactFiber'));
  let fiber = fiberKey ? element[fiberKey] : null;
  while (fiber) {
    let hook = fiber.memoizedState;
    while (hook) {
      if (Array.isArray(hook.memoizedState) && hook.memoizedState.some((item) => item?.name && item?.category) && hook.queue?.dispatch) {
        hook.queue.dispatch(products);
        return true;
      }
      hook = hook.next;
    }
    fiber = fiber.return;
  }
  return false;
})()`);
assert.equal(injectedLocalProducts, true, "the local product fixture must be connected to the customer UI");
await page.waitFor("[...document.querySelectorAll('.product-card h3')].some((heading) => heading.textContent.trim().endsWith('LQ-350'))");

const displayedProductNames = await page.evaluate("[...document.querySelectorAll('.product-card h3')].map((heading) => heading.textContent.trim())");
assert.ok(displayedProductNames.some((name) => name.endsWith("LQ-350")), `LQ-350 card missing: ${displayedProductNames.join(", ")}`);
await page.evaluate(`(() => {
  const card = [...document.querySelectorAll('.product-card')].find((item) => item.querySelector('h3')?.textContent.trim().endsWith('LQ-350'));
  card.querySelector('.quick-view').click();
})()`);
await page.waitFor("Boolean(document.querySelector('.product-modal'))");
assert.equal(await page.evaluate("Boolean(document.querySelector('.product-modal .modal-specs'))"), true);
const lqQuickView = await page.evaluate(`(() => Object.fromEntries(
  [...document.querySelectorAll('.modal-specs > div')].map((row) => [row.querySelector('dt').textContent.trim(), row.querySelector('dd').textContent.trim()])
))()`);
assert.equal(lqQuickView["الوظائف"], "طباعة فقط");
assert.equal(lqQuickView["منفذ متوازي Parallel"], "نعم");
assert.equal(lqQuickView["منفذ تسلسلي Serial / RS-232"], "نعم");
assert.equal(lqQuickView["نسخ الورق المتعدد"], "أصل + 3 نسخ");
assert.equal(lqQuickView["عمر الشريط"], "2.5 مليون حرف");
assert.equal(lqQuickView["نوع المستهلك"], "شريط طباعة");
for (const hiddenLabel of ["ADF", "الماسح الضوئي", "الفاكس", "عدد الألوان", "الطباعة بدون حواف", "الطباعة من الجوال"]) {
  assert.equal(hiddenLabel in lqQuickView, false, `${hiddenLabel} must stay hidden in the LQ quick view`);
}
await page.screenshot("printer-specifications-quick-view.png");

await page.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileModal = await page.evaluate(`(() => {
  const modal = document.querySelector('.product-modal');
  return {
    fitsViewport: modal.getBoundingClientRect().height <= innerHeight,
    overflow: getComputedStyle(modal).overflowY,
  };
})()`);
assert.equal(mobileModal.fitsViewport, true);
assert.ok(["auto", "scroll"].includes(mobileModal.overflow));
await page.screenshot("printer-specifications-quick-view-mobile.png");
await page.evaluate("document.querySelector('.product-modal').scrollTop = document.querySelector('.product-modal').scrollHeight");
await page.screenshot("printer-specifications-quick-view-mobile-lq-fields.png");

await page.send("Emulation.setDeviceMetricsOverride", { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
await page.send("Fetch.disable");
await page.navigate("http://localhost:3000/admin");
await page.waitFor("Boolean(document.querySelector('input[name=password]') || document.querySelector('.real-admin-toolbar'))");
if (await page.evaluate("Boolean(document.querySelector('input[name=password]'))")) {
  await page.evaluate(`(() => {
    const input = document.querySelector('input[name=password]');
    input.value = 'LocalTest-Only-2026';
    input.form.requestSubmit();
  })()`);
}
await page.waitFor("Boolean(document.querySelector('.real-admin-toolbar'))");
await page.waitFor(`(() => {
  const button = document.querySelectorAll('.real-admin-toolbar button')[3];
  const propsKey = button && Object.keys(button).find((key) => key.startsWith('__reactProps'));
  return Boolean(propsKey && typeof button[propsKey].onClick === 'function');
})()`);
assert.equal(await page.evaluate("document.querySelectorAll('.real-admin-toolbar button')[3].textContent.trim()"), "المنتجات");
await page.evaluate("document.querySelectorAll('.real-admin-toolbar button')[3].click()");
await page.waitFor("Boolean(document.querySelector('.product-editor .printer-specifications-editor'))");
await page.waitFor("!document.querySelector('.real-admin-card > p') || !document.querySelector('.real-admin-card > p').textContent.includes('جاري تحميل')");
const initialAdminProductCount = await page.evaluate("document.querySelectorAll('.products-manager article').length");

const adminInitial = await page.evaluate(`(() => ({
  categoryOptions: [...document.querySelector('.product-editor select[required]').options].slice(1).map((option) => ({ value: option.value, label: option.textContent.trim() })),
  triStates: [...document.querySelectorAll('.admin-tristate-grid select')].map((select) => select.value),
  familyHasSuggestions: document.querySelector('input[list="printer-family-options"]')?.getAttribute('list') === 'printer-family-options',
  descriptionCounter: document.querySelector('.description-counter').textContent.trim(),
}))()`);
assert.deepEqual(adminInitial.categoryOptions, PRINTER_CATEGORIES.map((category) => ({ ...category })));
assert.ok(adminInitial.triStates.length > 0 && adminInitial.triStates.every((value) => value === "unknown"));
assert.equal(adminInitial.familyHasSuggestions, true);
assert.equal(adminInitial.descriptionCounter, "0 / 160 حرفاً");

await page.evaluate(`(() => {
  const select = document.querySelector('.product-editor select[required]');
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(select, 'lq');
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await page.waitFor("Boolean(document.querySelector('.lq-specifications'))");
const lqState = await page.evaluate(`(() => {
  const labels = [...document.querySelectorAll('.printer-specifications-editor label')].filter((label) => label.offsetParent !== null).map((label) => label.textContent.trim());
  return {
    family: document.querySelector('input[list="printer-family-options"]').value,
    hasPins: labels.some((label) => label.startsWith('عدد الإبر')),
    hasColumns: labels.some((label) => label.startsWith('عدد أعمدة الطباعة')),
    hasConsumableType: labels.some((label) => label.startsWith('نوع المستهلك')),
    hasParallel: labels.some((label) => label.startsWith('منفذ متوازي Parallel')),
    hasSerial: labels.some((label) => label.startsWith('منفذ تسلسلي Serial / RS-232')),
    hasOptionalInterface: labels.some((label) => label.startsWith('يدعم واجهة اتصال اختيارية')),
    hasColorCount: labels.some((label) => label.startsWith('عدد الألوان')),
    hasAdfCapacity: labels.some((label) => label.startsWith('سعة ADF')),
    hasScanner: labels.some((label) => label.startsWith('ماسح ضوئي')),
  };
})()`);
assert.deepEqual(lqState, { family: "Epson LQ", hasPins: true, hasColumns: true, hasConsumableType: true, hasParallel: true, hasSerial: true, hasOptionalInterface: true, hasColorCount: false, hasAdfCapacity: false, hasScanner: false });

await page.evaluate(`(() => {
  const setSelect = (select, value) => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const category = document.querySelector('.product-editor select[required]');
  setSelect(category, 'lq');
})()`);
await page.waitFor("Boolean(document.querySelector('.lq-specifications'))");
await page.evaluate(`(() => {
  const findControl = (labelText) => [...document.querySelectorAll('.printer-specifications-editor label')]
    .find((label) => label.textContent.trim().startsWith(labelText))?.querySelector('input,select');
  const setInput = (input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const setSelect = (select, value) => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };
  setInput(document.querySelector('.product-editor input[required]'), 'منتج اختبار محلي');
  setSelect(findControl('مقاس الورق'), 'ورق متصل 80 عمود');
  setSelect(findControl('نوع الطابعة'), 'طابعة نقطية');
  setSelect(findControl('منفذ متوازي Parallel'), 'yes');
  setSelect(findControl('منفذ تسلسلي Serial / RS-232'), 'no');
  setSelect(findControl('يدعم واجهة اتصال اختيارية'), 'yes');
})()`);
await page.evaluate("document.querySelector('.product-editor button[type=submit]').click()");
await page.waitFor(`document.querySelectorAll('.products-manager article').length === ${initialAdminProductCount + 1}`);
await page.evaluate(`(() => {
  const product = [...document.querySelectorAll('.products-manager article')].find((item) => item.querySelector('b')?.textContent.trim() === 'منتج اختبار محلي');
  product.querySelector('button:not(.delete-product)').click();
})()`);
await page.waitFor("document.querySelector('.product-editor input[required]').value === 'منتج اختبار محلي'");
const restoredDraft = await page.evaluate(`(() => {
  const findControl = (labelText) => [...document.querySelectorAll('.printer-specifications-editor label')]
    .find((label) => label.textContent.trim().startsWith(labelText))?.querySelector('input,select');
  return {
    paperSize: findControl('مقاس الورق').value,
    printerType: findControl('نوع الطابعة').value,
    parallel: findControl('منفذ متوازي Parallel').value,
    serial: findControl('منفذ تسلسلي Serial / RS-232').value,
    optionalInterface: findControl('يدعم واجهة اتصال اختيارية').value,
  };
})()`);
assert.deepEqual(restoredDraft, { paperSize: "ورق متصل 80 عمود", printerType: "طابعة نقطية", parallel: "yes", serial: "no", optionalInterface: "yes" });

await page.evaluate(`(() => {
  const textarea = [...document.querySelectorAll('.product-editor textarea')].find((item) => item.closest('label')?.textContent.includes('الوصف القصير'));
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'س'.repeat(161));
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await page.waitFor("document.querySelector('.description-counter').classList.contains('over-limit')");
assert.equal(await page.evaluate("document.querySelector('.admin-field-error[role=alert]').textContent.includes('160')"), true);
await page.evaluate("document.querySelector('.lq-specifications').scrollIntoView({ block: 'center' })");
await page.screenshot("printer-specifications-admin.png");

console.log(JSON.stringify({ liveCounts, lqQuickView, mobileModal, lqState, restoredDraft, result: "passed" }, null, 2));
page.socket.close();
