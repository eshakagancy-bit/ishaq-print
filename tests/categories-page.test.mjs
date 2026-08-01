import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the categories route renders only centrally enabled category cards", async () => {
  const [page, home, styles, config] = await Promise.all([
    readFile(new URL("../app/categories/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/public-categories.ts", import.meta.url), "utf8"),
  ]);

  assert.match(config, /PUBLIC_ENABLED_CATEGORIES\s*=\s*\[\s*"printers",\s*"papers",\s*"inks",?\s*\]/s);
  assert.match(config, /PUBLIC_CATEGORY_DETAILS/);
  assert.match(page, /getSiteData\(\)/);
  assert.match(page, /PUBLIC_ENABLED_CATEGORIES\.map/);
  assert.match(page, /PUBLIC_CATEGORY_DETAILS\[category\]/);
  assert.match(page, /data\.settings\.categoryImages\[category\]/);
  assert.match(page, /products\[0\]\?\.images\?\.\[0\]/);
  assert.match(page, /className="categories-index-card" href=\{item\.href\}/);
  assert.match(page, /title: "الفئات \| وكالة إسحاق"/);
  assert.doesNotMatch(page, /CategoryProductsClient|category-products-list|visibleProducts\.map/);
  assert.match(home, /<Link href="\/categories" onClick=\{\(\) => setMenuOpen\(false\)\}>الفئات<\/Link>/);
  assert.match(home, /section === "categories" \? <Link key=\{section\} href="\/categories">/);
  assert.doesNotMatch(home, /categoriesMenuOpen|header-category-menu|header-category-trigger|closeOnOutsideClick/);
  assert.doesNotMatch(styles, /header-category-menu|header-category-trigger/);
  assert.match(styles, /\.categories-index-grid \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.categories-index-grid \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/);
  assert.match(styles, /\.categories-index-grid \{ grid-template-columns:1fr; gap:14px; \}/);
});
