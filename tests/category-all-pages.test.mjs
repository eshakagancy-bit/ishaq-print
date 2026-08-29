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

test("category collection cards use the storefront grid and preserve independent actions", async () => {
  const [client, styles, home] = await Promise.all([
    readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(styles, /\.category-products-list \{ display:grid; grid-template-columns:repeat\(auto-fill,minmax\(230px,1fr\)\)/);
  assert.match(styles, /\.category-product-row \{[^}]*display:flex;[^}]*flex-direction:column/);
  assert.doesNotMatch(client, /product-grid|product-group/);
  assert.match(client, /onClick=\{\(\) => toggleFavorite\(product\.id\)\}/);
  assert.match(client, /className="quick-view" onClick=\{\(event\) => openQuickView\(product, event\.currentTarget\)\}/);
  assert.match(client, /<div className="category-product-actions"><a href=\{whatsappLink\(product\)\} target="_blank" rel="noreferrer">اعرف السعر والتوفر<\/a><\/div>/);
  assert.match(client, /className="product-image-link" href=\{detailsHref\}/);
  assert.match(home, /STOREFRONT_CATEGORY_ORDER\.map/);
  assert.match(home, /PUBLIC_CATEGORY_DETAILS\[categoryId\]\.label/);
  assert.match(home, /<HomeProductSlider products=\{productCards\} label=\{PUBLIC_CATEGORY_DETAILS\[categoryId\]\.label\} \/>/);
  assert.match(home, /function HomeProductSlider/);
  assert.match(home, /const sliderRef = useRef<HTMLDivElement \| null>\(null\)/);
  assert.match(home, /const dragState = useRef/);
  assert.match(home, /event\.currentTarget\.setPointerCapture\(event\.pointerId\)/);
  assert.match(home, /event\.currentTarget\.scrollLeft = dragState\.current\.startScrollLeft - distance/);
  assert.match(styles, /\.home-category-sections \{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  assert.match(styles, /\.home-category-section \{ min-width:0; \}/);
  assert.match(styles, /\.home-category-products \{[\s\S]*?display:flex;[\s\S]*?flex-wrap:nowrap;[\s\S]*?scroll-snap-type:x proximity;/);
  assert.match(styles, /\.home-category-products \.product-card \{[\s\S]*?flex:0 0 clamp/);
});

test("home printers, papers and inks share one fixed image-first card ratio", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const portraitCards = String.raw`\.home-category-section \.product-card:is\(\[data-category="papers"\],\[data-category="inks"\]\)`;

  assert.match(styles, new RegExp(`\\.home-category-products \\.product-image,[\\s\\S]*?${portraitCards} \\.product-image \\{[\\s\\S]*?aspect-ratio:4/5;`));
  assert.match(styles, /\.home-category-products \.product-image img,[\s\S]*?object-fit:contain;[\s\S]*?object-position:center;/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?aspect-ratio:1\/1\.05;/);
});

test("the public home renders only three independent category rows without the legacy storefront", async () => {
  const [home, styles] = await Promise.all([
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(home, /id={`home-category-\$\{categoryId\}`}/);
  assert.match(home, /product\.category === categoryId/);
  assert.match(home, /data-product-id=\{product\.id\}/);
  assert.match(home, /data-product-slider=\{label\}/);
  assert.doesNotMatch(home, /home-category-(?:desktop|mobile)-products|desktopGroups|mobileGroups/);
  assert.doesNotMatch(home, /homeProductGroupIndices|changeHomeProductGroup|product-group-controls/);
  assert.match(
    home,
    /<a href=\{PUBLIC_CATEGORY_DETAILS\[categoryId\]\.href\}>عرض الكل/,
  );
  assert.doesNotMatch(home, /categories-view|أقسامنا التجارية|PRINTER_CATEGORIES|openPrinterFilter/);
  assert.doesNotMatch(home, /سيتم إضافة منتجات|قريبًا/);
  assert.match(styles, /\.home-category-products \{[\s\S]*?flex-wrap:nowrap;[\s\S]*?overflow-x:auto;/);
  assert.match(styles, /\.products-section>\.container \{ width:min\(1600px,calc\(100% - 48px\)\); \}/);
  assert.doesNotMatch(styles, /\.product-group \{/);
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
  assert.match(styles, /data-category="printers"[^}]*\.category-product-image \{ height:150px; flex:0 0 150px;/);
  assert.match(styles, /data-category="printers"[^}]*\.category-product-content \{ padding:10px;/);
  assert.match(styles, /data-category="printers"[^}]*\.category-product-content h2 \{[^}]*font-size:11px;/);
  assert.doesNotMatch(styles, /@media \(min-width:[^)]+\)[\s\S]*?data-category="printers"[^}]*\.category-products-list/);
});
