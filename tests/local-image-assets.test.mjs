import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const assets = [
  ["public/hero/technology-solutions.png", "public/hero/technology-solutions.webp", 1570389, 102072],
  ["public/products/wf-c5390.png", "public/products/wf-c5390.webp", 2134915, 155880],
  ["public/products/wf-c879r.png", "public/products/wf-c879r.webp", 3915624, 135894],
];

test("optimized public assets are WebP and materially smaller than their source references", async () => {
  for (const [source, optimized, expectedSourceSize, expectedOptimizedSize] of assets) {
    const [sourceInfo, optimizedInfo, bytes] = await Promise.all([
      stat(new URL(source, root)),
      stat(new URL(optimized, root)),
      readFile(new URL(optimized, root)),
    ]);
    assert.equal(sourceInfo.size, expectedSourceSize);
    assert.equal(optimizedInfo.size, expectedOptimizedSize);
    assert.ok(optimizedInfo.size < sourceInfo.size * 0.15);
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP");
  }
});

test("public defaults and legacy local paths resolve to optimized assets", async () => {
  const [defaults, mediaUrl] = await Promise.all([
    readFile(new URL("app/site-defaults.ts", root), "utf8"),
    readFile(new URL("lib/media-url.ts", root), "utf8"),
  ]);
  for (const [, optimized] of assets) {
    const publicPath = optimized.replace(/^public/, "");
    assert.match(`${defaults}\n${mediaUrl}`, new RegExp(publicPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(mediaUrl, /if \(optimizedLocalMedia\[value\]\) return optimizedLocalMedia\[value\]/);
  assert.doesNotMatch(mediaUrl, /advertising-machines\.png/);
});
