import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("homepage follows the image-led storefront journey", async () => {
  const [home, styles] = await Promise.all([read("app/home-client.tsx"), read("app/globals.css")]);
  const hero = home.indexOf('className="hero hero-slider"');
  const categories = home.indexOf('className="storefront-categories"');
  const products = home.indexOf('className="products-section"');
  const search = home.indexOf('className="search-panel-wrap"');
  const trust = home.indexOf('className="feature-band"');
  assert.ok(hero >= 0 && hero < categories && categories < products && products < search && search < trust);
  assert.match(home, /homeCategoryOrder: PublicEnabledCategory\[\] = \["printers", "inks", "papers"\]/);
  assert.match(home, /className="storefront-category-card"/);
  assert.match(home, /className="product-image-link" href=\{detailsHref\}/);
  assert.doesNotMatch(home.slice(home.indexOf("const renderProductCard"), home.indexOf("return (", home.indexOf("const renderProductCard"))), /cardTags|product\.description/);
  assert.match(styles, /\.storefront-category-grid \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /\.hero-slider \{ height:clamp\(520px,42vw,610px\); min-height:520px/);
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
