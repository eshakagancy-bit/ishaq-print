import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home uses a wide desktop container with four-by-two product groups without changing mobile", async () => {
  const [home, styles] = await Promise.all([
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(styles, /\.home-page \.container \{ width:min\(1440px,calc\(100% - 48px\)\); \}/);
  assert.match(styles, /\.product-group \{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\);[^}]*grid-template-rows:repeat\(2,auto\);[^}]*gap:20px;/);
  assert.match(home, /chunkProducts\(categoryProducts, HOME_DESKTOP_GROUP_SIZE\)/);
  assert.match(home, /className="home-category-desktop-grid product-group"/);
  assert.match(home, /className="product-group-controls"/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?\.home-page \.container \{ width:min\(100% - 28px,1180px\); \}/);
  assert.match(home, /chunkProducts\(categoryProducts, 6\)/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?\.home-category-desktop-products \{ display:none; \}[\s\S]*?\.home-category-mobile-products \{ display:flex; \}/);
  assert.doesNotMatch(styles, /zoom\s*:|transform\s*:\s*scale\([^)]*\)\s*;\s*\/\*\s*desktop/i);
});
