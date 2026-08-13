import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const CDP_BASE = process.env.CDP_BASE || "http://127.0.0.1:9777";
const artifactsDirectory = new URL("../test-artifacts/", import.meta.url);
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function openBrowserPage() {
  const target = await fetch(`${CDP_BASE}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
  const browserVersion = await fetch(`${CDP_BASE}/json/version`).then((response) => response.json());
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

  const waitFor = async (expression, timeout = 12_000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      try {
        if (await evaluate(expression)) return;
      } catch {
        // Navigation can replace the execution context between polls.
      }
      await delay(100);
    }
    throw new Error(`Timed out waiting for expression: ${expression}`);
  };

  const screenshot = async (name) => {
    const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await mkdir(artifactsDirectory, { recursive: true });
    await writeFile(new URL(name, artifactsDirectory), Buffer.from(result.data, "base64"));
  };

  sessionId = (await send("Target.attachToTarget", { targetId: target.id, flatten: true })).sessionId;
  await send("Page.enable");
  await send("Runtime.enable");

  const setMobileViewport = async () => {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844,
    });
    await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  };

  const setDesktopViewport = async () => {
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: 1440,
      screenHeight: 900,
    });
    await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  };

  const navigate = async () => {
    await send("Page.navigate", { url: APP_URL });
    await waitFor(`location.href.startsWith(${JSON.stringify(APP_URL)}) && document.readyState === "complete"`);
    await send("Page.bringToFront");
    await waitFor(`Object.keys(document.querySelector(".mobile-bottom-nav button") || {}).some((key) => key.startsWith("__reactProps"))`);
    await evaluate("document.fonts.ready.then(() => true)");
  };

  const inspect = (selector) => evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const covering = document.elementFromPoint(x, y);
    return {
      x, y,
      text: element.textContent?.trim() || "",
      type: element.getAttribute("type"),
      inForm: Boolean(element.closest("form")),
      isCovered: !covering || !(element === covering || element.contains(covering)),
      coveringTag: covering?.tagName || null,
      beforeY: scrollY,
      timeOrigin: performance.timeOrigin,
      url: location.href,
    };
  })()`);

  const bringIntoView = async (selector) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: "center", inline: "center", behavior: "instant" })`);
    await delay(150);
  };

  const tap = async (selector, { bring = false } = {}) => {
    if (bring) await bringIntoView(selector);
    const before = await inspect(selector);
    assert.ok(before, `missing touch target: ${selector}`);
    assert.equal(before.isCovered, false, `${selector} is covered by ${before.coveringTag}`);
    assert.equal(before.inForm, false, `${selector} must not be inside a form`);
    if (before.type !== null) assert.equal(before.type, "button", `${selector} must use type=button`);
    const touchPoint = [{ x: before.x, y: before.y, radiusX: 2, radiusY: 2, force: 1, id: 1 }];
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: touchPoint });
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    return before;
  };

  const click = async (selector, { bring = false } = {}) => {
    if (bring) await bringIntoView(selector);
    const before = await inspect(selector);
    assert.ok(before, `missing click target: ${selector}`);
    assert.equal(before.isCovered, false, `${selector} is covered by ${before.coveringTag}`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: before.x, y: before.y });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: before.x, y: before.y, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: before.x, y: before.y, button: "left", buttons: 0, clickCount: 1 });
    return before;
  };

  return {
    click,
    evaluate,
    navigate,
    screenshot,
    send,
    setDesktopViewport,
    setMobileViewport,
    socket,
    tap,
    targetId: target.id,
    waitFor,
  };
}

const page = await openBrowserPage();
const results = [];

const record = (name, details) => {
  results.push({ name, ...details });
  console.log(`${name}: ${JSON.stringify(details)}`);
};

const assertUniqueIds = async () => {
  const counts = await page.evaluate(`["home","categories","general-search","products","contact"].reduce((out,id) => {
    out[id] = document.querySelectorAll("#" + id).length;
    return out;
  }, {})`);
  for (const [id, count] of Object.entries(counts)) assert.equal(count, 1, `#${id} must be unique`);
};

const targetState = (targetId) => page.evaluate(`(() => {
  const target = document.getElementById(${JSON.stringify(targetId)});
  const rect = target.getBoundingClientRect();
  const headerBottom = document.querySelector(".header").getBoundingClientRect().bottom;
  const navTop = document.querySelector(".mobile-bottom-nav").getBoundingClientRect().top;
  return {
    scrollY,
    top: rect.top,
    bottom: rect.bottom,
    headerBottom,
    navTop,
    visible: rect.bottom > headerBottom && rect.top < navTop,
    active: [...document.querySelectorAll(".mobile-bottom-nav button.active")].map((item) => item.textContent.trim()),
    activeCount: document.querySelectorAll(".mobile-bottom-nav button.active").length,
    timeOrigin: performance.timeOrigin,
    url: location.href,
  };
})()`);

await page.setMobileViewport();
await page.navigate();
await assertUniqueIds();
assert.equal(
  await page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth"),
  true,
  "mobile page must not have horizontal overflow"
);

const navCases = [
  { label: "الفئات", targetId: "categories" },
  { label: "البحث", targetId: "general-search" },
  { label: "تواصل معنا", targetId: "contact" },
  { label: "الرئيسية", targetId: "home" },
];

for (const { label, targetId } of navCases) {
  if (label === "الرئيسية") {
    await page.evaluate("window.scrollTo({ top: 1400, behavior: 'instant' })");
    await delay(150);
  }
  const selector = `.mobile-bottom-nav button[data-browser-label="${label}"]`;
  await page.evaluate(`(() => {
    const button = [...document.querySelectorAll(".mobile-bottom-nav button")].find((item) => item.textContent.trim() === ${JSON.stringify(label)});
    if (button) button.dataset.browserLabel = ${JSON.stringify(label)};
  })()`);
  const before = await page.tap(selector);
  await page.waitFor(targetId === "home"
    ? "scrollY < 5"
    : `document.getElementById(${JSON.stringify(targetId)}).getBoundingClientRect().top < 100`);
  await delay(250);
  const after = await targetState(targetId);
  assert.ok(after.visible, `${label} target must be visible`);
  assert.equal(after.activeCount, 1, `${label} must leave exactly one active tab`);
  assert.deepEqual(after.active, [label], `${label} must become active`);
  assert.equal(after.timeOrigin, before.timeOrigin, `${label} must not reload the page`);
  assert.ok(label === "الرئيسية" ? after.scrollY < before.beforeY : after.scrollY !== before.beforeY, `${label} must move the page`);
  record(`bottom:${label}`, { beforeY: before.beforeY, afterY: after.scrollY, targetTop: after.top, active: after.active[0], reloaded: false });
}

const transitionCases = [
  {
    name: "browse-printers",
    selector: ".hero-buttons .primary-btn",
    expectedHeading: "طابعات EPSON",
  },
  {
    name: "category-printers",
    selector: '.category-main[aria-label="فتح قسم طابعات EPSON"]',
    expectedHeading: "طابعات EPSON",
    bring: true,
  },
  {
    name: "category-inks",
    selector: '.category-main[aria-label="فتح قسم الأحبار"]',
    expectedHeading: "الأحبار",
    bring: true,
  },
  {
    name: "category-papers",
    selector: '.category-main[aria-label="فتح قسم الأوراق"]',
    expectedHeading: "الأوراق",
    bring: true,
  },
  {
    name: "category-all-products",
    selector: '.category-main[aria-label="عرض جميع المنتجات"]',
    expectedHeading: "جميع المنتجات",
    bring: true,
  },
];

for (const testCase of transitionCases) {
  await page.navigate();
  const before = await page.tap(testCase.selector, { bring: testCase.bring });
  await page.waitFor(`document.querySelector("#products .section-heading h2")?.textContent.trim() === ${JSON.stringify(testCase.expectedHeading)} && document.getElementById("products").getBoundingClientRect().top < 100`);
  await delay(250);
  const after = await targetState("products");
  assert.ok(after.visible, `${testCase.name} products target must be visible`);
  assert.equal(after.timeOrigin, before.timeOrigin, `${testCase.name} must not reload`);
  record(testCase.name, { beforeY: before.beforeY, afterY: after.scrollY, targetTop: after.top, heading: testCase.expectedHeading, reloaded: false });
}

const typeSearch = async ({ name, selector, text, expectedHeading }) => {
  await page.navigate();
  await page.tap(selector, { bring: true });
  await page.send("Input.insertText", { text });
  await page.waitFor(`document.querySelector(${JSON.stringify(selector)}).value === ${JSON.stringify(text)} && document.getElementById("products").getBoundingClientRect().top < 100`);
  await delay(250);
  const state = await targetState("products");
  const heading = await page.evaluate('document.querySelector("#products .section-heading h2").textContent.trim()');
  const resultCount = await page.evaluate('document.querySelectorAll("#products .product-card").length');
  assert.equal(heading, expectedHeading);
  assert.ok(resultCount > 0, `${name} must render product results`);
  assert.ok(state.visible, `${name} results must be visible`);
  record(name, { afterY: state.scrollY, targetTop: state.top, heading, query: text, resultCount, reloaded: false });
};

await typeSearch({
  name: "printer-search",
  selector: '.search-field input[aria-label="البحث داخل قسم طابعات EPSON"]',
  text: "WF-C579R",
  expectedHeading: "طابعات EPSON",
});
await typeSearch({
  name: "general-search",
  selector: '.categories-search input[aria-label="البحث العام في جميع المنتجات"]',
  text: "EPSON",
  expectedHeading: "جميع المنتجات",
});

await page.navigate();
const targetsBeforeSpecialist = await fetch(`${CDP_BASE}/json/list`).then((response) => response.json());
const specialistBefore = await page.tap(".whatsapp-float");
let whatsappTarget;
for (let attempt = 0; attempt < 40 && !whatsappTarget; attempt += 1) {
  await delay(100);
  const targets = await fetch(`${CDP_BASE}/json/list`).then((response) => response.json());
  whatsappTarget = targets.find((target) =>
    target.type === "page"
    && !targetsBeforeSpecialist.some((beforeTarget) => beforeTarget.id === target.id)
    && /whatsapp\.com|wa\.me/.test(target.url)
  );
}
assert.ok(whatsappTarget, "specialist button must open the existing WhatsApp link");
const currentTimeOrigin = await page.evaluate("performance.timeOrigin");
assert.equal(currentTimeOrigin, specialistBefore.timeOrigin, "specialist button must not reload the current page");
record("specialist", { opened: whatsappTarget.url.split("?")[0], reloaded: false });
await fetch(`${CDP_BASE}/json/close/${whatsappTarget.id}`);
await page.send("Page.bringToFront");

await page.navigate();
const menuBefore = await page.tap(".menu-btn");
await page.waitFor('document.querySelector(".menu-btn").getAttribute("aria-expanded") === "true" && document.querySelector(".menu-overlay").classList.contains("open")');
const menuOpen = await page.evaluate(`({
  expanded: document.querySelector(".menu-btn").getAttribute("aria-expanded"),
  visible: document.querySelector(".site-menu-drawer").getBoundingClientRect().right === innerWidth,
  timeOrigin: performance.timeOrigin
})`);
assert.equal(menuOpen.timeOrigin, menuBefore.timeOrigin);
await page.tap(".drawer-close");
await page.waitFor('document.querySelector(".menu-btn").getAttribute("aria-expanded") === "false" && !document.querySelector(".menu-overlay").classList.contains("open")');
record("header-menu", { opened: menuOpen.visible, closed: true, reloaded: false });

await page.navigate();
await page.tap('.category-main[aria-label="فتح قسم طابعات EPSON"]', { bring: true });
await page.waitFor('document.getElementById("products").getBoundingClientRect().top < 100');
await page.tap(".product-image-trigger", { bring: true });
await page.waitFor('Boolean(document.querySelector(".product-modal-shell"))');
await page.tap(".modal-close");
await page.waitFor('!document.querySelector(".product-modal-shell")');
record("quick-view-regression", { opened: true, closed: true });

await page.screenshot("mobile-transitions-pass.png");

await page.setDesktopViewport();
await page.navigate();
const desktopState = await page.evaluate(`({
  bottomNavHidden: getComputedStyle(document.querySelector(".mobile-bottom-nav")).display === "none",
  width: innerWidth,
  overflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth
})`);
assert.deepEqual(desktopState, { bottomNavHidden: true, width: 1440, overflow: true });
const desktopBefore = await page.click(".hero-buttons .primary-btn");
await page.waitFor('document.getElementById("products").getBoundingClientRect().top < 100');
const desktopAfter = await page.evaluate(`({
  y: scrollY,
  targetTop: document.getElementById("products").getBoundingClientRect().top,
  timeOrigin: performance.timeOrigin
})`);
assert.equal(desktopAfter.timeOrigin, desktopBefore.timeOrigin);
assert.ok(desktopAfter.y !== desktopBefore.beforeY);
record("desktop-regression", { bottomNavHidden: true, beforeY: desktopBefore.beforeY, afterY: desktopAfter.y, targetTop: desktopAfter.targetTop, horizontalOverflow: !desktopState.overflow });
await page.screenshot("desktop-transitions-pass.png");

console.log(`PASS: ${results.length} browser transition checks`);
page.socket.close();
