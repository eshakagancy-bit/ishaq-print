import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { ALL_PRINTERS_FILTER, PRINTER_CATEGORIES } from "../app/printer-categories.ts";
import { normalizePrinterSpecifications } from "../app/printer-specifications.ts";

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
  const javascriptErrors = [];
  const resourceErrors = [];
  const networkErrors = [];
  const liveMutationRequests = [];
  const requestUrls = new Map();
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
  await send("Log.enable");
  eventHandlers.set("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    javascriptErrors.push(exceptionDetails.exception?.description ?? exceptionDetails.text ?? "Runtime exception");
  });
  eventHandlers.set("Log.entryAdded", ({ entry }) => {
    if (entry.level === "error") resourceErrors.push(entry.text);
  });
  eventHandlers.set("Network.requestWillBeSent", ({ requestId, request }) => {
    requestUrls.set(requestId, request.url);
    if (request.url.startsWith("https://ishaq-print-zeta.vercel.app")
      && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      liveMutationRequests.push({ method: request.method, url: request.url });
    }
  });
  eventHandlers.set("Network.responseReceived", ({ response }) => {
    if (response.status >= 400) networkErrors.push(`${response.status} ${response.url}`);
  });
  eventHandlers.set("Network.loadingFailed", ({ requestId, errorText, canceled }) => {
    if (!canceled && errorText !== "net::ERR_ABORTED") networkErrors.push(`${errorText} ${requestUrls.get(requestId) ?? requestId}`);
  });
  await send("Network.enable");
  if (mockedSiteData) {
    eventHandlers.set("Fetch.requestPaused", ({ requestId, request }) => {
      const body = request.url.includes("/api/admin/hero-slides")
        ? { slides: [], settings: {} }
        : request.url.includes("/api/admin/hero-settings")
          ? { settings: {} }
          : mockedSiteData;
      void send("Fetch.fulfillRequest", {
        requestId,
        responseCode: 200,
        responseHeaders: [{ name: "content-type", value: "application/json; charset=utf-8" }],
        body: Buffer.from(JSON.stringify(body)).toString("base64"),
      });
    });
    await send("Fetch.enable", { patterns: [
      { urlPattern: "*://*/api/site*" },
      { urlPattern: "*://*/api/admin/hero-slides*" },
      { urlPattern: "*://*/api/admin/hero-settings*" },
    ] });
  }
  await navigate(url);
  return { evaluate, javascriptErrors, liveMutationRequests, navigate, networkErrors, resourceErrors, screenshot, send, socket, waitFor };
}

const liveData = await fetch("https://ishaq-print-zeta.vercel.app/api/site?specAudit=1").then((response) => response.json());
const livePrinters = liveData.products.filter((product) => product.category === "printers");
const liveCounts = Object.fromEntries([
  ["all", livePrinters.length],
  ...PRINTER_CATEGORIES.map((category) => [category.value, livePrinters.filter((product) => product.printerCategory === category.value).length]),
]);
assert.deepEqual(liveCounts, { all: 25, workforce: 12, ecotank: 7, "ecotank-6-color": 3, lq: 3 });

const localTestData = structuredClone(liveData);
for (const product of localTestData.products) product.image = "/brand/eshak-logo.png";
const ecoTankMigration = await readFile(new URL("../supabase/migrations/20260722090300_populate_ecotank_phase_two_specifications.sql", import.meta.url), "utf8");
const approvedEcoTankNames = [
  "EPSON EcoTank L11050", "EPSON EcoTank L15150", "EPSON EcoTank L18050",
  "EPSON EcoTank L3210", "EPSON EcoTank L3250", "EPSON EcoTank L4260",
  "EPSON EcoTank L6270", "EPSON EcoTank L6490", "EPSON EcoTank L8050",
  "EPSON EcoTank L8180",
];
const approvedEcoTankProducts = Object.fromEntries(approvedEcoTankNames.map((name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = ecoTankMigration.match(new RegExp(
    `\\(\\s*'${escapedName}',\\s*'([^']+)',\\s*'([^']+)',\\s*'([^']+)',\\s*'([^']+)',\\s*'([^']*)',\\s*'(\\[[^']*\\])'::jsonb,\\s*'(\\{[^']+\\})'::jsonb,\\s*'([^']+)'\\s*\\)`,
  ));
  assert.ok(match, `approved browser fixture missing for ${name}`);
  return [name, {
    printerCategory: match[1], family: match[2], size: match[3], type: match[4],
    description: match[5], features: JSON.parse(match[6]), specifications: normalizePrinterSpecifications(JSON.parse(match[7])),
    specificationsSourceUrl: match[8], specificationsVerifiedAt: "2026-07-22T00:00:00.000Z",
  }];
}));
for (const [name, approved] of Object.entries(approvedEcoTankProducts)) {
  const product = localTestData.products.find((item) => item.name === name);
  assert.ok(product, `${name} must exist in the read-only live fixture`);
  Object.assign(product, approved);
}
const workForceMigration = await readFile(new URL("../supabase/migrations/20260723090000_populate_workforce_phase_three_specifications.sql", import.meta.url), "utf8");
const approvedWorkForceTuples = [...workForceMigration.matchAll(
  /\(\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'(\[[^']*\])'::jsonb,\s*'(\{[^']+\})'::jsonb,\s*'(https:\/\/[^']+)'\s*\)/g,
)];
assert.equal(approvedWorkForceTuples.length, 12, "the local WorkForce browser fixture must contain twelve approved products");
const approvedWorkForceProducts = Object.fromEntries(approvedWorkForceTuples.map((match) => [match[2], {
  oldName: match[1],
  name: match[2],
  family: match[3],
  size: match[4],
  type: match[5],
  description: match[6],
  features: JSON.parse(match[7]),
  specifications: normalizePrinterSpecifications(JSON.parse(match[8])),
  specificationsSourceUrl: match[9],
  specificationsVerifiedAt: "2026-07-23T00:00:00.000Z",
}]));
for (const approved of Object.values(approvedWorkForceProducts)) {
  const product = localTestData.products.find((item) => item.name === approved.name);
  assert.ok(product, `${approved.name} must exist in the read-only live fixture`);
  Object.assign(product, approved);
}
const lq350 = localTestData.products.find((product) => product.name === "LQ-350");
assert.ok(lq350, "LQ-350 must exist in the read-only source data");
Object.assign(lq350, {
  badge: "",
  price: "1,250 ريال",
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
const l8180 = localTestData.products.find((product) => product.name === "EPSON EcoTank L8180");
assert.ok(l8180, "EPSON EcoTank L8180 must exist in the read-only source data");
Object.assign(l8180, { badge: "", price: "" });

const page = await openPage("http://127.0.0.1:3000", localTestData);
await page.waitFor("document.querySelectorAll('.filters button').length === 5");
const expectedLabels = [ALL_PRINTERS_FILTER.label, ...PRINTER_CATEGORIES.map((category) => category.label)];
assert.deepEqual(
  await page.evaluate("[...document.querySelectorAll('.filters button')].map((button) => button.textContent.trim())"),
  expectedLabels,
);
assert.equal(await page.evaluate("getComputedStyle(document.body).direction"), "rtl");

await page.waitFor(`(() => {
  const element = document.querySelector('.product-grid');
  const fiberKey = element && Object.keys(element).find((key) => key.startsWith('__reactFiber'));
  let fiber = fiberKey ? element[fiberKey] : null;
  while (fiber) {
    let hook = fiber.memoizedState;
    while (hook) {
      if (Array.isArray(hook.memoizedState) && hook.queue?.dispatch) return true;
      hook = hook.next;
    }
    fiber = fiber.return;
  }
  return false;
})()`);
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

const ecoTankQuickViews = {};
for (const name of approvedEcoTankNames) {
  await page.evaluate(`(() => {
    const card = [...document.querySelectorAll('.product-card')].find((item) => item.querySelector('h3')?.textContent.trim() === ${JSON.stringify(name)});
    card.querySelector('.quick-view').click();
  })()`);
  await page.waitFor("Boolean(document.querySelector('.product-modal'))");
  const quickView = await page.evaluate(`(() => Object.fromEntries(
    [...document.querySelectorAll('.modal-specs > div')].map((row) => [row.querySelector('dt').textContent.trim(), row.querySelector('dd').textContent.trim()])
  ))()`);
  ecoTankQuickViews[name] = quickView;
  const approvedSpecifications = approvedEcoTankProducts[name].specifications;
  const duplexLabels = { none: "لا يوجد طباعة على الوجهين", manual: "طباعة يدوية على الوجهين", automatic: "طباعة تلقائية على الوجهين" };
  assert.equal("سرعة الطباعة" in quickView, false, `${name}: speed must stay hidden`);
  if (approvedSpecifications.duplexMode === null) assert.equal("وضع الطباعة على الوجهين" in quickView || "الطباعة التلقائية على الوجهين" in quickView, false, `${name}: unknown duplex hidden`);
  else assert.equal(quickView["وضع الطباعة على الوجهين"], duplexLabels[approvedSpecifications.duplexMode], `${name}: duplex mode`);
  if (name === "EPSON EcoTank L3210") {
    assert.equal("Wi-Fi" in quickView, false, `${name}: Wi-Fi must stay hidden`);
    assert.equal("Wi-Fi Direct" in quickView, false, `${name}: Wi-Fi Direct must stay hidden`);
  } else {
    if (approvedSpecifications.wifi === null) assert.equal("Wi-Fi" in quickView, false, `${name}: unknown Wi-Fi hidden`);
    else assert.equal(quickView["Wi-Fi"], approvedSpecifications.wifi ? "نعم" : "لا", `${name}: Wi-Fi`);
    assert.equal(quickView["Wi-Fi Direct"], approvedSpecifications.wifiDirect ? "نعم" : "لا", `${name}: Wi-Fi Direct`);
  }
  assert.equal(quickView["مقاس الورق"], approvedSpecifications.paperSize, `${name}: paper size`);
  assert.equal(quickView["عدد الألوان"], `${approvedSpecifications.colorCount} ألوان`, `${name}: color count`);
  assert.equal(quickView["طباعة CD/DVD"], approvedSpecifications.cdDvdPrinting ? "نعم" : "لا", `${name}: CD/DVD printing`);
  if (approvedSpecifications.plasticCardPrinting === null) assert.equal("طباعة البطاقات البلاستيكية" in quickView, false, `${name}: unknown plastic-card value hidden`);
  else assert.equal(quickView["طباعة البطاقات البلاستيكية"], approvedSpecifications.plasticCardPrinting ? "نعم" : "لا", `${name}: plastic-card printing`);
  assert.equal("زمن طباعة الصورة" in quickView, false, `${name}: unknown photo time must stay hidden`);
  if (name === "EPSON EcoTank L11050") assert.equal("الطباعة بدون حواف" in quickView, false, `${name}: unknown borderless support hidden`);
  if (name === "EPSON EcoTank L8180") {
    assert.equal(await page.evaluate("document.querySelector('.modal-price strong').textContent.trim()"), "اطلب عرض سعر");
    assert.equal(await page.evaluate("Boolean(document.querySelector('.modal-product-badge'))"), false);
  }
  await page.evaluate("document.querySelector('.modal-close').click()");
  await page.waitFor("!document.querySelector('.product-modal')");
}

const workForceQuickViews = {};
for (const [name, approved] of Object.entries(approvedWorkForceProducts)) {
  await page.evaluate(`(() => {
    const card = [...document.querySelectorAll('.product-card')].find((item) => item.querySelector('h3')?.textContent.trim() === ${JSON.stringify(name)});
    card.querySelector('.quick-view').click();
  })()`);
  await page.waitFor("Boolean(document.querySelector('.product-modal'))");
  const quickView = await page.evaluate(`(() => Object.fromEntries(
    [...document.querySelectorAll('.modal-specs > div')].map((row) => [row.querySelector('dt').textContent.trim(), row.querySelector('dd').textContent.trim()])
  ))()`);
  workForceQuickViews[name] = quickView;
  assert.equal(quickView["سرعة الطباعة"], `${approved.specifications.printSpeed} صفحة/دقيقة`, `${name}: speed`);
  assert.equal(quickView["مقاس الورق"], approved.specifications.paperSize, `${name}: paper size`);
  assert.equal(quickView["سعة الورق القياسية"], `${approved.specifications.standardPaperCapacity} ورقة`, `${name}: standard capacity`);
  assert.equal(quickView["سعة الورق القصوى"], `${approved.specifications.maximumPaperCapacity} ورقة`, `${name}: maximum capacity`);
  assert.ok(quickView["نظام الحبر"], `${name}: ink system`);
  for (const hiddenLabel of ["طباعة CD/DVD", "طباعة البطاقات البلاستيكية", "زمن طباعة الصورة", "عدد الإبر", "عمر الشريط"]) {
    assert.equal(hiddenLabel in quickView, false, `${name}: ${hiddenLabel} must stay hidden`);
  }
  if (approved.specifications.wifiAvailability === "optional") assert.equal(quickView["Wi-Fi"], "اختياري", `${name}: optional Wi-Fi`);
  if (approved.specifications.faxMode === "optional") assert.equal(quickView["الفاكس"], "اختياري", `${name}: optional fax`);
  const cardTags = await page.evaluate(`(() => {
    const card = [...document.querySelectorAll('.product-card')].find((item) => item.querySelector('h3')?.textContent.trim() === ${JSON.stringify(name)});
    return [...card.querySelectorAll('.product-tags span')].map((tag) => tag.textContent.trim());
  })()`);
  assert.ok(cardTags.includes(`${approved.specifications.printSpeed} صفحة/دقيقة`), `${name}: card speed tag`);
  await page.evaluate("document.querySelector('.modal-close').click()");
  await page.waitFor("!document.querySelector('.product-modal')");
}

await page.evaluate(`(() => {
  const card = [...document.querySelectorAll('.product-card')].find((item) => item.querySelector('h3')?.textContent.trim().endsWith('LQ-350'));
  const trigger = card.querySelector('.quick-view');
  trigger.focus();
  trigger.click();
})()`);
await page.waitFor("Boolean(document.querySelector('.product-modal'))");
await page.waitFor("document.activeElement === document.querySelector('.modal-close')");
assert.equal(await page.evaluate("Boolean(document.querySelector('.product-modal .modal-specs'))"), true);
assert.equal(await page.evaluate("document.querySelector('.modal-price strong').textContent.trim()"), "1,250 ريال");
assert.equal(await page.evaluate("Boolean(document.querySelector('.modal-product-badge'))"), false);
const dialogAccessibility = await page.evaluate(`(() => {
  const dialog = document.querySelector('.product-modal-shell');
  const title = document.querySelector('.modal-content h2');
  const background = [...document.querySelectorAll('main > :not(.modal-backdrop)')];
  return {
    role: dialog.getAttribute('role'),
    ariaModal: dialog.getAttribute('aria-modal'),
    labelledBy: dialog.getAttribute('aria-labelledby'),
    titleId: title.id,
    backgroundInert: background.length > 0 && background.every((element) => element.inert && element.getAttribute('aria-hidden') === 'true'),
    bodyLocked: document.body.style.overflow === 'hidden' && document.documentElement.style.overflow === 'hidden',
  };
})()`);
assert.equal(dialogAccessibility.role, "dialog");
assert.equal(dialogAccessibility.ariaModal, "true");
assert.equal(dialogAccessibility.labelledBy, dialogAccessibility.titleId);
assert.match(dialogAccessibility.titleId, /^product-dialog-title-\d+$/);
assert.equal(dialogAccessibility.backgroundInert, true);
assert.equal(dialogAccessibility.bodyLocked, true);
await page.evaluate(`(() => {
  const lastFocusable = document.querySelector('.product-modal .primary-btn');
  lastFocusable.focus();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
})()`);
assert.equal(await page.evaluate("document.activeElement === document.querySelector('.modal-close')"), true, "Tab must wrap to the first dialog control");
await page.evaluate(`(() => {
  document.querySelector('.modal-close').focus();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
})()`);
assert.equal(await page.evaluate("document.activeElement === document.querySelector('.product-modal .primary-btn')"), true, "Shift+Tab must wrap to the last dialog control");
await page.evaluate("document.querySelector('.modal-content').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))");
assert.equal(await page.evaluate("Boolean(document.querySelector('.product-modal'))"), true, "clicking inside the dialog must not close it");
const lqQuickView = await page.evaluate(`(() => Object.fromEntries(
  [...document.querySelectorAll('.modal-specs > div')].map((row) => [row.querySelector('dt').textContent.trim(), row.querySelector('dd').textContent.trim()])
))()`);
assert.equal(lqQuickView["الوظائف"], "طباعة فقط");
assert.equal(lqQuickView["منفذ متوازي Parallel"], "نعم");
assert.equal(lqQuickView["منفذ تسلسلي Serial / RS-232"], "نعم");
assert.equal(lqQuickView["نسخ الورق المتعدد"], "أصل + 3 نسخ");
assert.equal(lqQuickView["عمر الشريط"], "2.5 مليون حرف");
assert.equal(lqQuickView["نوع المستهلك"], "شريط طباعة");
for (const hiddenLabel of ["Wi-Fi", "Wi-Fi Direct", "ADF", "الماسح الضوئي", "الفاكس", "عدد الألوان", "الطباعة بدون حواف", "الطباعة من الجوال"]) {
  assert.equal(hiddenLabel in lqQuickView, false, `${hiddenLabel} must stay hidden in the LQ quick view`);
}
await page.evaluate(`(() => {
  document.querySelector('.product-modal').scrollTop = 0;
  document.querySelector('.modal-close').focus();
})()`);
await page.screenshot("printer-specifications-quick-view.png");

await page.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await page.evaluate("document.querySelector('.product-modal').scrollTop = 0");
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
await page.screenshot("final-quick-view-mobile-after-fixes.png");
await page.evaluate("document.querySelector('.product-modal').scrollTop = document.querySelector('.product-modal').scrollHeight");
await page.screenshot("printer-specifications-quick-view-mobile-lq-fields.png");

await page.evaluate("document.querySelector('.modal-close').click()");
await page.waitFor("!document.querySelector('.product-modal')");
await page.waitFor(`(() => {
  const card = [...document.querySelectorAll('.product-card')].find((item) => item.querySelector('h3')?.textContent.trim().endsWith('LQ-350'));
  return document.activeElement === card.querySelector('.quick-view');
})()`);
assert.equal(await page.evaluate("document.body.style.overflow === '' && document.documentElement.style.overflow === ''"), true);

await page.evaluate(`(() => {
  const card = [...document.querySelectorAll('.product-card')].find((item) => item.querySelector('h3')?.textContent.trim().endsWith('LQ-350'));
  const trigger = card.querySelector('.quick-view');
  trigger.focus();
  trigger.click();
})()`);
await page.waitFor("document.activeElement === document.querySelector('.modal-close')");
await page.evaluate("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))");
await page.waitFor("!document.querySelector('.product-modal')");
await page.waitFor(`(() => {
  const card = [...document.querySelectorAll('.product-card')].find((item) => item.querySelector('h3')?.textContent.trim().endsWith('LQ-350'));
  return document.activeElement === card.querySelector('.quick-view');
})()`);

await page.evaluate(`(() => {
  const card = [...document.querySelectorAll('.product-card')].find((item) => item.querySelector('h3')?.textContent.trim().endsWith('LQ-350'));
  const trigger = card.querySelector('.quick-view');
  trigger.focus();
  trigger.click();
})()`);
await page.waitFor("document.activeElement === document.querySelector('.modal-close')");
await page.evaluate("document.querySelector('.modal-content').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))");
assert.equal(await page.evaluate("Boolean(document.querySelector('.product-modal'))"), true);
await page.evaluate("document.querySelector('.modal-backdrop').dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))");
await page.waitFor("!document.querySelector('.product-modal')");
await page.waitFor(`(() => {
  const card = [...document.querySelectorAll('.product-card')].find((item) => item.querySelector('h3')?.textContent.trim().endsWith('LQ-350'));
  return document.activeElement === card.querySelector('.quick-view');
})()`);
await page.evaluate(`(() => {
  const card = [...document.querySelectorAll('.product-card')].find((item) => item.querySelector('h3')?.textContent.trim() === 'EPSON EcoTank L8180');
  card.querySelector('.quick-view').click();
})()`);
await page.waitFor("Boolean(document.querySelector('.product-modal'))");
const mobileEcoTankModal = await page.evaluate(`(() => {
  const shell = document.querySelector('.product-modal-shell');
  const modal = document.querySelector('.product-modal');
  const close = document.querySelector('.modal-close');
  const shellRect = shell.getBoundingClientRect();
  const closeRect = close.getBoundingClientRect();
  return {
    fitsViewport: shellRect.height <= innerHeight && shellRect.width <= innerWidth,
    overflow: getComputedStyle(modal).overflowY,
    noHorizontalScroll: modal.scrollWidth <= modal.clientWidth && document.documentElement.scrollWidth <= innerWidth,
    closeVisible: closeRect.top >= 0 && closeRect.bottom <= innerHeight && closeRect.left >= 0 && closeRect.right <= innerWidth,
  };
})()`);
assert.deepEqual(mobileEcoTankModal, { fitsViewport: true, overflow: "auto", noHorizontalScroll: true, closeVisible: true });
await page.evaluate("document.querySelector('.product-modal').scrollTop = document.querySelector('.product-modal').scrollHeight");
const mobileCloseAfterScroll = await page.evaluate(`(() => {
  const closeRect = document.querySelector('.modal-close').getBoundingClientRect();
  return closeRect.top >= 0 && closeRect.bottom <= innerHeight && closeRect.left >= 0 && closeRect.right <= innerWidth;
})()`);
assert.equal(mobileCloseAfterScroll, true);
await page.screenshot("ecotank-phase-two-quick-view-mobile.png");

await page.evaluate("document.querySelector('.modal-close').click()");
await page.waitFor("!document.querySelector('.product-modal')");
await page.evaluate(`(() => {
  const card = [...document.querySelectorAll('.product-card')].find((item) => item.querySelector('h3')?.textContent.trim() === 'Epson WorkForce Enterprise AM-C4000');
  card.querySelector('.quick-view').click();
})()`);
await page.waitFor("Boolean(document.querySelector('.product-modal'))");
const mobileWorkForceModal = await page.evaluate(`(() => {
  const shell = document.querySelector('.product-modal-shell');
  const modal = document.querySelector('.product-modal');
  const close = document.querySelector('.modal-close');
  const shellRect = shell.getBoundingClientRect();
  const closeRect = close.getBoundingClientRect();
  const values = Object.fromEntries([...document.querySelectorAll('.modal-specs > div')].map((row) => [
    row.querySelector('dt').textContent.trim(), row.querySelector('dd').textContent.trim(),
  ]));
  return {
    fitsViewport: shellRect.height <= innerHeight && shellRect.width <= innerWidth,
    overflow: getComputedStyle(modal).overflowY,
    noHorizontalScroll: modal.scrollWidth <= modal.clientWidth && document.documentElement.scrollWidth <= innerWidth,
    closeVisible: closeRect.top >= 0 && closeRect.bottom <= innerHeight && closeRect.left >= 0 && closeRect.right <= innerWidth,
    wifi: values["Wi-Fi"],
    fax: values["الفاكس"],
    speed: values["سرعة الطباعة"],
    inkSystem: values["نظام الحبر"],
  };
})()`);
assert.deepEqual(mobileWorkForceModal, {
  fitsViewport: true, overflow: "auto", noHorizontalScroll: true, closeVisible: true,
  wifi: "اختياري", fax: "اختياري", speed: "40 صفحة/دقيقة", inkSystem: "نظام حبر مؤسسي",
});
await page.evaluate("document.querySelector('.product-modal').scrollTop = document.querySelector('.product-modal').scrollHeight");
assert.equal(await page.evaluate(`(() => {
  const closeRect = document.querySelector('.modal-close').getBoundingClientRect();
  return closeRect.top >= 0 && closeRect.bottom <= innerHeight && closeRect.left >= 0 && closeRect.right <= innerWidth;
})()`), true);
await page.screenshot("workforce-phase-three-quick-view-mobile.png");

await page.send("Emulation.setDeviceMetricsOverride", { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
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
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'ecotank');
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await page.waitFor("[...document.querySelectorAll('.printer-specifications-editor label')].some((label) => label.textContent.trim().startsWith('Wi-Fi Direct'))");
const ecoTankAdminState = await page.evaluate(`(() => {
  const labels = [...document.querySelectorAll('.printer-specifications-editor label')].filter((label) => label.offsetParent !== null).map((label) => label.textContent.trim());
  return {
    family: document.querySelector('input[list="printer-family-options"]').value,
    hasWifiDirect: labels.some((label) => label.startsWith('Wi-Fi Direct')),
    hasDuplexMode: labels.some((label) => label.startsWith('وضع الدوبلكس')),
    hasCdDvd: labels.some((label) => label.startsWith('طباعة CD/DVD')),
    hasPlasticCards: labels.some((label) => label.startsWith('طباعة البطاقات البلاستيكية')),
    hasPhotoTime: labels.some((label) => label.startsWith('زمن طباعة الصورة بالثواني')),
    hasPins: labels.some((label) => label.startsWith('عدد الإبر')),
    hasParallel: labels.some((label) => label.startsWith('منفذ متوازي Parallel')),
  };
})()`);
assert.deepEqual(ecoTankAdminState, {
  family: "Epson EcoTank", hasWifiDirect: true, hasDuplexMode: true, hasCdDvd: true,
  hasPlasticCards: true, hasPhotoTime: true, hasPins: false, hasParallel: false,
});
await page.evaluate(`([...document.querySelectorAll('.printer-specifications-editor label')]
  .find((label) => label.textContent.trim().startsWith('Wi-Fi Direct'))).scrollIntoView({ block: 'start' })`);
await page.screenshot("ecotank-phase-two-admin-fields.png");

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
  setInput(document.querySelector('.product-editor input[required]'), 'منتج EcoTank محلي');
  setSelect(findControl('Wi-Fi Direct'), 'yes');
  setSelect(findControl('وضع الدوبلكس'), 'manual');
  setSelect(findControl('طباعة CD/DVD'), 'yes');
  setSelect(findControl('طباعة البطاقات البلاستيكية'), 'no');
  setInput(findControl('زمن طباعة الصورة بالثواني'), '45');
})()`);

await page.evaluate(`(() => {
  const select = document.querySelector('.product-editor select[required]');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'lq');
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await page.waitFor("Boolean(document.querySelector('.lq-specifications'))");
assert.equal(await page.evaluate("[...document.querySelectorAll('.printer-specifications-editor label')].some((label) => label.textContent.trim().startsWith('Wi-Fi Direct'))"), false);
await page.evaluate(`(() => {
  const select = document.querySelector('.product-editor select[required]');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'ecotank-6-color');
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await page.waitFor("[...document.querySelectorAll('.printer-specifications-editor label')].some((label) => label.textContent.trim().startsWith('Wi-Fi Direct'))");
const restoredEcoTankDraft = await page.evaluate(`(() => {
  const findControl = (labelText) => [...document.querySelectorAll('.printer-specifications-editor label')]
    .find((label) => label.textContent.trim().startsWith(labelText))?.querySelector('input,select');
  return {
    wifiDirect: findControl('Wi-Fi Direct').value,
    duplexMode: findControl('وضع الدوبلكس').value,
    cdDvdPrinting: findControl('طباعة CD/DVD').value,
    plasticCardPrinting: findControl('طباعة البطاقات البلاستيكية').value,
    photoPrintTimeSeconds: findControl('زمن طباعة الصورة بالثواني').value,
  };
})()`);
assert.deepEqual(restoredEcoTankDraft, { wifiDirect: "yes", duplexMode: "manual", cdDvdPrinting: "yes", plasticCardPrinting: "no", photoPrintTimeSeconds: "45" });
await page.evaluate("document.querySelector('.product-editor button[type=submit]').click()");
await page.waitFor(`document.querySelectorAll('.products-manager article').length === ${initialAdminProductCount + 1}`);
await page.evaluate(`(() => {
  const product = [...document.querySelectorAll('.products-manager article')].find((item) => item.querySelector('b')?.textContent.trim() === 'منتج EcoTank محلي');
  product.querySelector('button:not(.delete-product)').click();
})()`);
await page.waitFor("document.querySelector('.product-editor input[required]').value === 'منتج EcoTank محلي'");
assert.deepEqual(await page.evaluate(`(() => {
  const findControl = (labelText) => [...document.querySelectorAll('.printer-specifications-editor label')]
    .find((label) => label.textContent.trim().startsWith(labelText))?.querySelector('input,select');
  return { wifiDirect: findControl('Wi-Fi Direct').value, duplexMode: findControl('وضع الدوبلكس').value, cdDvdPrinting: findControl('طباعة CD/DVD').value, plasticCardPrinting: findControl('طباعة البطاقات البلاستيكية').value, photoPrintTimeSeconds: findControl('زمن طباعة الصورة بالثواني').value };
})()`), restoredEcoTankDraft);
await page.evaluate("document.querySelector('.product-editor button[type=button]').click()");

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
await page.waitFor(`document.querySelectorAll('.products-manager article').length === ${initialAdminProductCount + 2}`);
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

await page.evaluate("document.querySelector('.product-editor button[type=button]').click()");
await page.evaluate(`(() => {
  const select = document.querySelector('.product-editor select[required]');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, 'workforce');
  select.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await page.waitFor("Boolean(document.querySelector('.workforce-specifications'))");
const workForceAdminState = await page.evaluate(`(() => {
  const labels = [...document.querySelectorAll('.printer-specifications-editor label')].filter((label) => label.offsetParent !== null).map((label) => label.textContent.trim());
  return {
    family: document.querySelector('input[list="printer-family-options"]').value,
    hasWifiAvailability: labels.some((label) => label.startsWith('توفر Wi-Fi')),
    hasFaxMode: labels.some((label) => label.startsWith('توفر الفاكس')),
    hasInkSystem: labels.some((label) => label.startsWith('نظام الحبر')),
    hasDuplexScanning: labels.some((label) => label.startsWith('مسح الوجهين')),
    hasPaperCapacity: labels.some((label) => label.startsWith('سعة الورق القياسية')),
    hasPrintLanguages: document.querySelector('.printer-specifications-editor')?.textContent.includes('لغات الطباعة') === true,
    hasEcoMedia: labels.some((label) => label.startsWith('طباعة CD/DVD') || label.startsWith('طباعة البطاقات البلاستيكية')),
    hasLqFields: labels.some((label) => label.startsWith('عدد الإبر') || label.startsWith('منفذ متوازي Parallel')),
  };
})()`);
assert.deepEqual(workForceAdminState, {
  family: "Epson WorkForce Pro", hasWifiAvailability: true, hasFaxMode: true, hasInkSystem: true,
  hasDuplexScanning: true, hasPaperCapacity: true, hasPrintLanguages: true, hasEcoMedia: false, hasLqFields: false,
});
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
  setInput(document.querySelector('.product-editor input[required]'), 'منتج WorkForce محلي');
  setSelect(findControl('توفر Wi-Fi'), 'optional');
  setSelect(findControl('توفر الفاكس'), 'optional');
  setSelect(findControl('نظام الحبر'), 'enterprise');
  setSelect(findControl('نوع مسح ADF على الوجهين'), 'singlePass');
  setSelect(findControl('مسح الوجهين'), 'yes');
  setSelect(findControl('دعم وحدات التشطيب'), 'yes');
  setInput(findControl('سعة الورق القياسية'), '1150');
  setInput(findControl('سعة الورق القصوى'), '5150');
  const pcl6 = [...document.querySelectorAll('.workforce-specifications .admin-check')].find((label) => label.textContent.trim() === 'PCL6')?.querySelector('input');
  pcl6.click();
})()`);
await page.evaluate(`(() => {
  const category = document.querySelector('.product-editor select[required]');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(category, 'ecotank');
  category.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await page.waitFor("!document.querySelector('.workforce-specifications')");
await page.evaluate(`(() => {
  const category = document.querySelector('.product-editor select[required]');
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(category, 'workforce');
  category.dispatchEvent(new Event('change', { bubbles: true }));
})()`);
await page.waitFor("Boolean(document.querySelector('.workforce-specifications'))");
const restoredWorkForceDraft = await page.evaluate(`(() => {
  const findControl = (labelText) => [...document.querySelectorAll('.printer-specifications-editor label')]
    .find((label) => label.textContent.trim().startsWith(labelText))?.querySelector('input,select');
  return {
    wifiAvailability: findControl('توفر Wi-Fi').value,
    faxMode: findControl('توفر الفاكس').value,
    inkSystem: findControl('نظام الحبر').value,
    adfDuplexType: findControl('نوع مسح ADF على الوجهين').value,
    duplexScanning: findControl('مسح الوجهين').value,
    finisherSupport: findControl('دعم وحدات التشطيب').value,
    standardPaperCapacity: findControl('سعة الورق القياسية').value,
    maximumPaperCapacity: findControl('سعة الورق القصوى').value,
    pcl6: [...document.querySelectorAll('.workforce-specifications .admin-check')].find((label) => label.textContent.trim() === 'PCL6')?.querySelector('input').checked,
  };
})()`);
assert.deepEqual(restoredWorkForceDraft, {
  wifiAvailability: "optional", faxMode: "optional", inkSystem: "enterprise", adfDuplexType: "singlePass",
  duplexScanning: "yes", finisherSupport: "yes", standardPaperCapacity: "1150", maximumPaperCapacity: "5150", pcl6: true,
});
await page.evaluate("document.querySelector('.product-editor button[type=submit]').click()");
await page.waitFor(`document.querySelectorAll('.products-manager article').length === ${initialAdminProductCount + 3}`);
await page.evaluate(`(() => {
  const product = [...document.querySelectorAll('.products-manager article')].find((item) => item.querySelector('b')?.textContent.trim() === 'منتج WorkForce محلي');
  product.querySelector('button:not(.delete-product)').click();
})()`);
await page.waitFor("document.querySelector('.product-editor input[required]').value === 'منتج WorkForce محلي'");
assert.equal(await page.evaluate(`([...document.querySelectorAll('.printer-specifications-editor label')]
  .find((label) => label.textContent.trim().startsWith('توفر Wi-Fi'))?.querySelector('select').value)`), "optional");
await page.screenshot("workforce-phase-three-admin-fields.png");

await page.evaluate(`(() => {
  const textarea = [...document.querySelectorAll('.product-editor textarea')].find((item) => item.closest('label')?.textContent.includes('الوصف القصير'));
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'س'.repeat(161));
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
})()`);
await page.waitFor("document.querySelector('.description-counter').classList.contains('over-limit')");
assert.equal(await page.evaluate("document.querySelector('.admin-field-error[role=alert]').textContent.includes('160')"), true);
await page.evaluate("document.querySelector('.workforce-specifications').scrollIntoView({ block: 'center' })");
await page.screenshot("printer-specifications-admin.png");

await page.screenshot("ecotank-phase-two-admin.png");
assert.deepEqual(page.javascriptErrors, [], `browser JavaScript errors: ${page.javascriptErrors.join(" | ")}`);
assert.deepEqual(page.resourceErrors, [], `browser resource errors: ${page.resourceErrors.join(" | ")}`);
assert.deepEqual(page.networkErrors, [], `browser network errors: ${page.networkErrors.join(" | ")}`);
assert.deepEqual(page.liveMutationRequests, [], `live mutation requests: ${JSON.stringify(page.liveMutationRequests)}`);

console.log(JSON.stringify({ liveCounts, testedEcoTankQuickViews: Object.keys(ecoTankQuickViews).length, testedWorkForceQuickViews: Object.keys(workForceQuickViews).length, javascriptErrors: page.javascriptErrors.length, resourceErrors: page.resourceErrors.length, networkErrors: page.networkErrors.length, liveMutationRequests: page.liveMutationRequests.length, dialogAccessibility, lqQuickView, mobileModal, mobileEcoTankModal, mobileWorkForceModal, mobileCloseAfterScroll, ecoTankAdminState, restoredEcoTankDraft, lqState, restoredDraft, workForceAdminState, restoredWorkForceDraft, result: "passed" }, null, 2));
page.socket.close();
