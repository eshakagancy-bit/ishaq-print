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
  assert.match(page, /className="categories-index-card" data-category=\{item\.category\} href=\{item\.href\}/);
  assert.match(page, /title: "الفئات \| وكالة إسحاق العالمية"/);
  assert.doesNotMatch(page, /CategoryProductsClient|category-products-list|visibleProducts\.map/);
  assert.match(home, /<Link href="\/categories" onClick=\{\(\) => setActiveHeaderDrawer\("closed"\)\}>/);
  assert.match(home, /if \(section === "categories"\) return <Link key=\{section\} href="\/categories">/);
  assert.doesNotMatch(home, /categoriesMenuOpen|header-category-menu|header-category-trigger|closeOnOutsideClick/);
  assert.doesNotMatch(styles, /header-category-menu|header-category-trigger/);
  assert.match(styles, /\.categories-index-grid \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.categories-index-grid \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/);
  assert.match(styles, /\.categories-index-grid \{ grid-template-columns:1fr; gap:14px; \}/);
});

test("category cards keep one image area while fitting each product type without cropping", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("../app/categories/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /className="categories-index-card" data-category=\{item\.category\}/);
  assert.match(styles, /\.categories-index-image \{ position:relative; height:220px;[^}]*overflow:hidden;/);
  assert.match(styles, /\.categories-index-image img \{[^}]*position:absolute;[^}]*inset:0;[^}]*width:88%;[^}]*height:88%;[^}]*max-width:100%;[^}]*max-height:100%;[^}]*margin:auto;[^}]*object-fit:contain;[^}]*object-position:center;/);
  assert.match(styles, /data-category="printers"[^}]*width:92%;[^}]*height:90%;[^}]*padding:8px 10px;/);
  assert.match(styles, /data-category="papers"[^}]*width:90%;[^}]*height:94%;[^}]*padding:10px 14px;/);
  assert.match(styles, /data-category="inks"[^}]*width:90%;[^}]*height:92%;[^}]*padding:10px 12px;/);
  assert.match(styles, /@media \(max-width:560px\)[\s\S]*?\.categories-index-image \{ height:190px; \}/);
  assert.doesNotMatch(styles, /categories-index-card\[data-category="(?:printers|papers|inks)"\][^}]*object-fit:cover/);
});
