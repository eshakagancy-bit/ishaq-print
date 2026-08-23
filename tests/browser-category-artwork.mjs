import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9779";
const artifactDir = process.env.ARTIFACT_DIR || "test-artifacts";
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const expected = [
  { category: "printers", href: "/printers", image: "/categories/printers-unified.png" },
  { category: "inks", href: "/inks", image: "/categories/inks-unified.png" },
  { category: "papers", href: "/papers", image: "/categories/papers-unified.png" },
];

const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocketClient(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
const pending = new Map();
const consoleErrors = [];
const networkFailures = [];
let id = 0;
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const messageId = ++id;
  pending.set(messageId, { resolve, reject });
  socket.send(JSON.stringify({ id: messageId, method, params }));
});
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push(message.params.args.map((argument) => argument.value || argument.description).join(" "));
  if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails?.text || "Runtime exception");
  if (message.method === "Network.loadingFailed" && !message.params.canceled) networkFailures.push(message.params.errorText);
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
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
};
const navigate = async ({ width, height }) => {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 760, screenWidth: width, screenHeight: height });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await send("Page.navigate", { url: appUrl });
  await waitFor("document.readyState === 'complete' && document.querySelectorAll('.storefront-category-card').length === 3 && [...document.querySelectorAll('.storefront-category-image img')].every((image) => image.complete && image.naturalWidth > 0)");
};
const inspect = () => evaluate(`(() => ({
  overflow: document.documentElement.scrollWidth > innerWidth,
  cards: [...document.querySelectorAll('.storefront-category-card')].map((card) => {
    const box = card.querySelector('.storefront-category-image').getBoundingClientRect();
    const image = card.querySelector('img');
    const heading = card.querySelector('h3').getBoundingClientRect();
    const boxStyle = getComputedStyle(card.querySelector('.storefront-category-image'));
    const imageStyle = getComputedStyle(image);
    return {
      category: card.dataset.category,
      href: card.getAttribute('href'),
      image: (() => { const url=new URL(image.currentSrc || image.src); return url.pathname === '/_next/image' ? url.searchParams.get('url') : url.pathname; })(),
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      width: box.width,
      height: box.height,
      headingGap: heading.top - box.bottom,
      objectFit: imageStyle.objectFit,
      objectPosition: imageStyle.objectPosition,
      overflow: boxStyle.overflow,
      background: boxStyle.backgroundColor,
    };
  }),
}))()`);
const assertLayout = (result, viewport) => {
  assert.equal(result.overflow, false, `${viewport} horizontal overflow`);
  assert.equal(result.cards.length, 3);
  result.cards.forEach((card, index) => {
    assert.equal(card.category, expected[index].category);
    assert.equal(card.href, expected[index].href);
    assert.equal(card.image, expected[index].image);
    assert.equal(card.naturalWidth, card.naturalHeight);
    assert.ok(card.naturalWidth >= card.width * 0.95, `${viewport} ${card.category} responsive source size`);
    assert.ok(Math.abs(card.width - card.height) < 0.5, `${viewport} ${card.category} square`);
    assert.equal(card.objectFit, "contain");
    assert.equal(card.objectPosition, "50% 50%");
    assert.equal(card.overflow, "visible");
    assert.equal(card.background, "rgba(0, 0, 0, 0)");
  });
  assert.ok(Math.max(...result.cards.map((card) => card.width)) - Math.min(...result.cards.map((card) => card.width)) < 0.5, `${viewport} equal widths`);
  assert.ok(Math.max(...result.cards.map((card) => card.headingGap)) - Math.min(...result.cards.map((card) => card.headingGap)) < 0.5, `${viewport} equal heading gaps`);
};
const screenshotSection = async (name) => {
  const clip = await evaluate(`(() => { const rect=document.querySelector('.storefront-categories').getBoundingClientRect(); return { x:0, y:rect.top + scrollY, width:document.documentElement.clientWidth, height:rect.height, scale:1 }; })()`);
  const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip, fromSurface: true });
  await mkdir(artifactDir, { recursive: true });
  await writeFile(join(artifactDir, name), Buffer.from(image.data, "base64"));
};

await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable")]);
const results = {};
for (const viewport of [{ name: "desktop-1440", width: 1440, height: 1000 }, { name: "desktop-1366", width: 1366, height: 900 }, { name: "mobile-390", width: 390, height: 844 }]) {
  await navigate(viewport);
  assertLayout(await inspect(), viewport.name);
  const statuses = await evaluate(`Promise.all(${JSON.stringify(expected.map(({ href }) => href))}.map(async (path) => (await fetch(path, { method: 'HEAD' })).status))`);
  assert.deepEqual(statuses, [200, 200, 200]);
  await screenshotSection(`category-artwork-${viewport.name}.png`);
  results[viewport.name] = "PASS";
}

await navigate({ width: 1440, height: 1000 });
await evaluate("document.querySelector('.storefront-category-card').scrollIntoView({block:'center'})");
await delay(400);
const hoverPoint = await evaluate(`(() => { const rect=document.querySelector('.storefront-category-card').getBoundingClientRect(); return { x:rect.left + rect.width/2, y:rect.top + rect.height/2 }; })()`);
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: hoverPoint.x, y: hoverPoint.y });
await delay(300);
assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.storefront-category-card')).transform"), "none");
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await delay(50);
assert.equal(await evaluate("getComputedStyle(document.querySelector('.storefront-category-card')).transform"), "none");

const relevantConsoleErrors = consoleErrors.filter((message) => !message.includes("eval() is not supported in this environment"));
assert.deepEqual(relevantConsoleErrors, []);
assert.deepEqual(networkFailures, []);
console.log(JSON.stringify({ ...results, hover: "PASS", reducedMotion: "PASS", links: "PASS", consoleErrors: relevantConsoleErrors, networkFailures }, null, 2));
socket.close();
