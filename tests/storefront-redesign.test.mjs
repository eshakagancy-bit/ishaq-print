import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage follows the image-led storefront journey", async () => {
  const [home, styles] = await Promise.all([read("app/home-client.tsx"), read("app/globals.css")]);
  const hero = home.indexOf('className="hero hero-slider"');
  const categories = home.indexOf('className="storefront-categories"');
  const products = home.indexOf('className="products-section"');
  const services = home.indexOf('className="services"');
  assert.ok(hero >= 0 && hero < categories && categories < products && products < services);
  assert.doesNotMatch(home, /className="feature-band"|من أول استشارة حتى تشغيل الطابعة|تواصل مع مختص الطابعات/);
  assert.doesNotMatch(home, /className="contact-banner"|دعنا نساعدك في اختيار الحل الأنسب/);
  assert.doesNotMatch(home, /className="search-panel-wrap"|ابحث في جميع المنتجات/);
  assert.match(home, /homeCategoryOrder: PublicEnabledCategory\[\] = \["printers", "inks", "papers"\]/);
  assert.match(home, /className="storefront-category-card"/);
  assert.match(home, /className="product-card-link" href=\{detailsHref\}/);
  assert.doesNotMatch(home.slice(home.indexOf("const renderProductCard"), home.indexOf("return (", home.indexOf("const renderProductCard"))), /cardTags|product\.description/);
  assert.match(styles, /\.storefront-category-grid \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.hero-slider \{ width:100%; height:auto; min-height:0; aspect-ratio:16\/9;/);
});

test("homepage product tiles use factual category lines instead of price and commercial footer", async () => {
  const [home, styles] = await Promise.all([read("app/home-client.tsx"), read("app/globals.css")]);
  const start = home.indexOf("const renderProductCard");
  const card = home.slice(start, home.indexOf("return (", start));

  assert.match(card, /className="product-card-link" href=\{detailsHref\}/);
  assert.match(card, /\? "heart active" : "heart"/);
  assert.match(card, /className="quick-view"/);
  assert.match(card, /className="product-category-line"/);
  assert.match(home, /HOME_PRINTER_LABELS\[product\.printerCategory\]/);
  assert.match(await read("app/printer-categories.ts"), /LQ \(طابعات الفواتير والسندات\)/);
  assert.match(home, /product\.inkSpecifications\?\.inkType\?\.trim\(\) \|\| product\.type/);
  assert.match(home, /product\.paperSpecifications\?\.paperType\?\.trim\(\) \|\| product\.type/);
  assert.match(home, /product\.inkSpecifications\?\.brand\?\.trim\(\) \|\| product\.family/);
  assert.match(home, /product\.paperSpecifications\?\.brand\?\.trim\(\) \|\| product\.family/);
  assert.doesNotMatch(card, /productPriceLabel|className="price"|className="product-footer"|اعرف السعر والتوفر/);
  assert.match(styles, /\.product-card-link \{ position:absolute; z-index:2; inset:0;/);
  assert.match(styles, /\.product-category-line \{[^}]*color:var\(--store-cyan-dark\)/);
});

test("homepage categories are three circular links without legacy card details", async () => {
  const [home, styles] = await Promise.all([read("app/home-client.tsx"), read("app/globals.css")]);
  const categoryStart = home.indexOf('<section className="storefront-categories"');
  const section = home.slice(categoryStart, home.indexOf("</div></section>", categoryStart) + "</div></section>".length);

  assert.equal((section.match(/className="storefront-category-card"/g) ?? []).length, 1, "one mapped category-link template renders the three current categories");
  assert.match(section, /homeCategoryOrder\.map/);
  assert.match(section, /href=\{PUBLIC_CATEGORY_DETAILS\[categoryId\]\.href\}/);
  assert.match(section, /<h3>\{PUBLIC_CATEGORY_DETAILS\[categoryId\]\.label\}<\/h3>/);
  assert.doesNotMatch(section, /منتجات|تصفح القسم|تسوق الآن|عرض جميع الفئات|<b>|<i/);
  assert.match(styles, /\.storefront-category-image \{[^}]*aspect-ratio:1;[^}]*border-radius:50%;/);
  assert.match(styles, /\.storefront-category-card \{[^}]*display:flex;[^}]*align-items:center;[^}]*cursor:pointer;/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?\.storefront-category-grid \{ grid-template-columns:repeat\(3,minmax\(0,1fr\)\); gap:12px; \}/);
  assert.match(styles, /\.storefront-category-card:focus-visible \{[^}]*outline:/);
});

test("collections provide real safe sorting and a mobile filter drawer", async () => {
  const [client, styles] = await Promise.all([read("app/category-products-client.tsx"), read("app/globals.css")]);
  assert.match(client, /type SortMode = "default" \| "name-asc" \| "name-desc"/);
  assert.match(client, /productNameCollator\.compare\(displayName\(first\), displayName\(second\)\)/);
  assert.match(client, /value="name-asc">الاسم A–Z/);
  assert.match(client, /value="name-desc">الاسم Z–A/);
  assert.doesNotMatch(client, /price-(?:asc|desc)|الأقل سعر|الأعلى سعر/);
  assert.match(client, /aria-controls="collection-filters"/);
  assert.match(styles, /\.printer-category-filters \{ position:fixed; z-index:72;/);
  assert.match(styles, /\.category-products-list \{ display:grid; grid-template-columns:repeat\(auto-fill,minmax\(230px,1fr\)\)/);
});

test("product details keep factual commerce and favorites without checkout", async () => {
  const sources = await Promise.all([
    read("app/printers/[slug]/page.tsx"),
    read("app/papers/[slug]/page.tsx"),
    read("app/inks/[slug]/page.tsx"),
  ]);
  for (const source of sources) {
    assert.match(source, /productPriceLabel\(product\.price\)/);
    assert.match(source, />اعرف السعر والتوفر<\/a>/);
    assert.match(source, /<ProductFavoriteButton productId=\{product\.id\} \/>/);
    assert.doesNotMatch(source, /إضافة إلى السلة|Checkout|شراء الآن/);
  }
});
