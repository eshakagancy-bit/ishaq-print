import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("all public product cards place one unified quick-details action below the name", async () => {
  const [home, styles] = await Promise.all([
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(home, /عرض سريع/);
  assert.match(home, /<h3>\{getProductDisplayName\(product\)\}<\/h3><button type="button" className="quick-view"[\s\S]*?تفاصيل سريعة<\/button>/);
  assert.doesNotMatch(home, /className="product-image"[^\n]*className="quick-view"/);
  assert.match(home, /className="quick-view" onClick=\{\(event\) => openQuickView\(product, event\.currentTarget\)\}/);
  assert.match(styles, /\.quick-view \{ width:100%;/);
  assert.doesNotMatch(styles, /\.quick-view \{ position:absolute/);
  assert.match(styles, /\.quick-view:focus-visible/);
});
