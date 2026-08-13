import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("all public product cards place one unified subtle quick-details action over the image", async () => {
  const [home, styles] = await Promise.all([
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(home, /عرض سريع/);
  assert.match(home, /className="product-image"[^\n]*className="quick-view"[\s\S]*?تفاصيل سريعة<\/span>/);
  assert.match(home, /className="quick-view" onClick=\{\(event\) => openQuickView\(product, event\.currentTarget\)\}/);
  assert.match(styles, /\.product-image \.quick-view,[^\n]*\.category-product-image \.quick-view \{ position:absolute/);
  assert.match(styles, /\.quick-view:focus-visible/);
});

test("storefront quick view does not paint placeholder bands around loaded images", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /\.modal-image img\[data-nimg\] \{ background:transparent; \}/);
});
