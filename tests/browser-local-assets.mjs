import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WebSocketClient = require("next/dist/compiled/ws");
const appUrl = process.env.APP_URL || "http://127.0.0.1:3100";
const cdpBase = process.env.CDP_BASE || "http://127.0.0.1:9780";
const optimizedPaths = [
  "/hero/technology-solutions.webp",
  "/products/wf-c5390.webp",
  "/products/wf-c879r.webp",
];
const oldPaths = optimizedPaths.map((path) => path.replace(/\.webp$/, ".png"));
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

for (const path of optimizedPaths) {
  const response = await fetch(`${appUrl}${path}`);
  assert.equal(response.status, 200, `${path} must return 200`);
  assert.equal(response.headers.get("content-type"), "image/webp", `${path} must be WebP`);
  const bytes = (await response.arrayBuffer()).byteLength;
  assert.ok(bytes < 200_000, `${path} should remain below 200 KB`);
}

const target = await fetch(`${cdpBase}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocketClient(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
const pending = new Map();
const consoleErrors = [];
const imageResponses = new Map();
const imageRequestUrls = [];
let id = 0;
socket.on("message", (raw) => {
  const message = JSON.parse(raw.toString());
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    consoleErrors.push(message.params.args.map((argument) => argument.value || argument.description).join(" "));
  }
  if (message.method === "Network.responseReceived" && message.params.type === "Image") {
    const url = new URL(message.params.response.url);
    imageRequestUrls.push(url.href);
    imageResponses.set(url.pathname, { status: message.params.response.status, mimeType: message.params.response.mimeType });
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
  socket.send(JSON.stringify({ id: messageId, method, params }));
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const navigate = async (path, width, height) => {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 760, screenWidth: width, screenHeight: height });
  await send("Page.navigate", { url: `${appUrl}${path}` });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate("document.readyState === 'complete' && Boolean(document.querySelector('main'))")) break;
    await delay(100);
  }
  await delay(600);
};
const inspect = async (width, height) => {
  await navigate("/", width, height);
  await evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
  await delay(800);
  await evaluate("window.scrollTo(0, 0)");
  await delay(300);
  const result = await evaluate(`(() => {
    const activeHero = document.querySelector('.hero-slide.active img');
    const relevant = [...document.images].filter((image) => /(?:advertising-machines|technology-solutions|wf-c5390|wf-c879r)/.test(image.currentSrc));
    return {
      width: innerWidth,
      overflow: document.documentElement.scrollWidth > innerWidth,
      heroVisible: Boolean(activeHero && activeHero.getBoundingClientRect().width > 0 && activeHero.getBoundingClientRect().height > 0 && activeHero.complete && activeHero.naturalWidth > 0),
      optimizedSources: relevant.map((image) => new URL(image.currentSrc).pathname),
      brokenRelevantImages: relevant.filter((image) => image.complete && image.naturalWidth === 0).length,
    };
  })()`);
  assert.equal(result.overflow, false, `${width}: no page overflow`);
  assert.equal(result.heroVisible, true, `${width}: active Hero must render`);
  assert.equal(result.brokenRelevantImages, 0, `${width}: optimized images must render`);
  assert.equal(result.optimizedSources.some((path) => oldPaths.includes(path)), false, `${width}: old PNG must not be used`);
  assert.ok(result.optimizedSources.some((path) => optimizedPaths.includes(path)), `${width}: optimized image must be present`);
  return result;
};

await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable")]);
const desktop = await inspect(1366, 768);
await navigate("/categories", 1366, 768);
assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false, "categories must not overflow");
assert.equal(await evaluate("[...document.images].filter((image) => image.complete && image.naturalWidth === 0).length"), 0, "categories must have no broken images");
const mobile = await inspect(390, 844);

for (const [path, response] of imageResponses) {
  if (optimizedPaths.includes(path)) {
    assert.ok(response.status === 200 || response.status === 304);
    assert.equal(response.mimeType, "image/webp");
  }
}
const uniqueImageRequests = [...new Set(imageRequestUrls)].map((value) => new URL(value));
const transformedSources = uniqueImageRequests
  .filter((url) => url.pathname === "/_next/image")
  .map((url) => url.searchParams.get("url"))
  .filter(Boolean);
const directlyServedPreoptimized = uniqueImageRequests
  .filter((url) => url.pathname !== "/_next/image" && /\.(?:avif|webp)$/i.test(url.pathname))
  .map((url) => url.pathname);
assert.deepEqual(
  transformedSources.filter((source) => /\.(?:avif|webp)(?:[?#]|$)/i.test(source)),
  [],
  "preoptimized images must never pass through /_next/image",
);
assert.ok(transformedSources.some((source) => /\.(?:jpe?g|png)(?:[?#]|$)/i.test(source)), "PNG or JPEG should retain Next optimization");
assert.ok(directlyServedPreoptimized.some((path) => optimizedPaths.includes(path)), "preoptimized WebP must load directly");
assert.deepEqual(consoleErrors, []);
console.log(JSON.stringify({ desktop, mobile, directlyServedPreoptimized, transformedSources, optimizedNetworkResponses: Object.fromEntries([...imageResponses].filter(([path]) => optimizedPaths.includes(path))), consoleErrors }, null, 2));
socket.close();
