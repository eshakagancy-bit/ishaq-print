import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the three public category index routes use one vertical list and category-only data", async () => {
  const categories = ["printers", "inks", "papers"];
  for (const category of categories) {
    const page = await readFile(new URL(`../app/${category}/page.tsx`, import.meta.url), "utf8");
    assert.match(page, new RegExp(`isPublicCategoryEnabled\\("${category}"\\)`));
    assert.match(page, new RegExp(`product\\.category === "${category}"`));
    assert.match(page, new RegExp(`category="${category}"`));
    assert.match(page, /getSiteData\(\)/);
  }
});

test("category index cards stay vertical and preserve their independent actions", async () => {
  const [client, styles, home] = await Promise.all([
    readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(styles, /\.category-products-list \{ display:flex; flex-direction:column;/);
  assert.match(styles, /\.category-product-row \{[^}]*grid-template-columns:280px minmax\(0,1fr\)/);
  assert.match(styles, /\.category-product-row \{ grid-template-columns:1fr; \}/);
  assert.doesNotMatch(client, /product-grid|product-group/);
  assert.match(client, /onClick=\{\(\) => toggleFavorite\(product\.id\)\}/);
  assert.match(client, /onClick=\{\(event\) => openQuickView\(product, event\.currentTarget\)\}>تفاصيل سريعة/);
  assert.match(client, /اطلب من المختص/);
  assert.doesNotMatch(client, /فتح صفحة التفاصيل/);
  assert.match(home, /homeCategoryOrder = PUBLIC_ENABLED_CATEGORIES/);
  assert.match(home, /PUBLIC_CATEGORY_DETAILS\[categoryId\]\.label/);
  assert.match(home, /className={`home-category-mobile-products product-grid\$\{mobileGroups\.length > 1 \? " has-more" : ""\}`}/);
  assert.match(styles, /\.home-category-sections \{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(styles, /\.home-category-section \{ min-width:0; \}/);
  assert.match(styles, /\.product-grid \{ display:flex;[^}]*scroll-snap-type:x mandatory;/);
  assert.match(styles, /\.home-category-desktop-grid \.product-card \{ width:auto; min-width:0; \}/);
});

test("home paper and ink cards use a portrait image area without changing printers", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const portraitCards = String.raw`\.home-category-section \.product-card:is\(\[data-category="papers"\],\[data-category="inks"\]\)`;

  assert.match(styles, new RegExp(`${portraitCards} \\.product-image \\{[^}]*height:auto;[^}]*flex:0 0 auto;[^}]*aspect-ratio:4/5;`));
  assert.match(styles, new RegExp(`${portraitCards} \\.product-image img \\{[^}]*width:94%;[^}]*height:94%;[^}]*object-fit:contain;[^}]*object-position:center;`));
  assert.match(styles, /\.product-image \{ position:relative; height:220px; flex:0 0 220px;/);
  assert.doesNotMatch(styles, /data-category="printers"[^}]*aspect-ratio/);
});

test("the public home renders only three independent category rows without the legacy storefront", async () => {
  const [home, styles] = await Promise.all([
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(home, /id={`home-category-\$\{categoryId\}`}/);
  assert.match(home, /product\.category === categoryId/);
  assert.match(home, /HOME_DESKTOP_GROUP_SIZE = 8/);
  assert.match(home, /home-category-desktop-grid product-group/);
  assert.match(
    home,
    /<a href=\{PUBLIC_CATEGORY_DETAILS\[categoryId\]\.href\}>الكل<\/a>/,
  );
  assert.doesNotMatch(home, /categories-view|أقسامنا التجارية|PRINTER_CATEGORIES|productGroups|openPrinterFilter/);
  assert.doesNotMatch(home, /سيتم إضافة منتجات|قريبًا/);
  assert.match(styles, /\.product-grid \{ display:flex;[^}]*scroll-snap-type:x mandatory;/);
  assert.match(styles, /\.home-page \.container \{ width:min\(1440px,calc\(100% - 48px\)\); \}/);
  assert.match(styles, /\.product-group \{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\);[^}]*grid-template-rows:repeat\(2,auto\);/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?\.product-group \{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\);[^}]*grid-template-rows:repeat\(2,auto\);/);
  assert.match(styles, /scroll-snap-align:start/);
});

test("the printers page uses a compact two-column grid only on mobile", async () => {
  const [client, styles] = await Promise.all([
    readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(client, /className="category-products-page" data-category=\{category\} dir="rtl"/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?data-category="printers"[^}]*\.category-products-list \{[^}]*display:grid;[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\);[^}]*gap:9px;/);
  assert.match(styles, /data-category="printers"[^}]*\.category-product-row \{[^}]*height:100%;[^}]*display:flex;[^}]*flex-direction:column;/);
  assert.match(styles, /data-category="printers"[^}]*\.category-product-image \{[^}]*height:128px;[^}]*flex:0 0 128px;/);
  assert.match(styles, /data-category="printers"[^}]*\.category-product-image img \{[^}]*width:90%;[^}]*height:90%;[^}]*object-fit:contain;[^}]*object-position:center;/);
  assert.match(styles, /data-category="printers"[^}]*\.category-product-content h2 \{[^}]*overflow-wrap:anywhere;[^}]*font-size:12px;[^}]*-webkit-line-clamp:2;/);
  assert.match(styles, /data-category="printers"[^}]*\.category-product-content>p \{[^}]*overflow:hidden;[^}]*font-size:8px;[^}]*-webkit-line-clamp:3;/);
  assert.match(styles, /data-category="printers"[^}]*\.category-product-actions \{[^}]*grid-template-columns:1fr;/);
  assert.doesNotMatch(styles, /@media \(min-width:[^)]+\)[\s\S]*?data-category="printers"[^}]*\.category-products-list/);
});
