import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("global inline search is replaced by an accessible header icon", async () => {
  const [home, styles] = await Promise.all([read("app/home-client.tsx"), read("app/globals.css")]);
  assert.doesNotMatch(home, /className="search-panel-wrap"|id="general-search"|ابحث في جميع المنتجات/);
  assert.doesNotMatch(styles, /\.search-panel-wrap|\.search-panel \{|\.quick-points/);
  assert.match(home, /className="header-left-actions"[\s\S]*?className="favorite-counter"[\s\S]*?className="header-search-button"/);
  assert.match(home, /aria-label="فتح البحث" aria-controls="search-drawer" aria-expanded=\{searchOpen\} aria-haspopup="dialog"/);
});

test("search drawer is a left-side modal using the shared overlay and drawer state", async () => {
  const [home, styles] = await Promise.all([read("app/home-client.tsx"), read("app/globals.css")]);
  assert.match(home, /useState<"closed" \| "menu" \| "wishlist" \| "search">\("closed"\)/);
  assert.match(home, /id="search-drawer" className="search-drawer" role="dialog" aria-modal=\{searchOpen \? "true" : undefined\} aria-hidden=\{!searchOpen\} inert=\{!searchOpen\}/);
  assert.match(styles, /\.search-drawer \{[^}]*left:0;[^}]*width:min\(420px,92vw\);[^}]*height:100dvh;[^}]*transform:translateX\(-100%\)/);
  assert.match(styles, /\.menu-overlay\.search-open \.search-drawer \{ transform:translateX\(0\)/);
  assert.match(home, /if \(event\.target === event\.currentTarget\) setActiveHeaderDrawer\("closed"\)/);
});

test("category selector exposes only the four requested effective scopes", async () => {
  const home = await read("app/home-client.tsx");
  const selector = home.slice(home.indexOf('id="global-search-scope"'), home.indexOf('</select>', home.indexOf('id="global-search-scope"')));
  assert.match(selector, /value="all">جميع الفئات/);
  assert.match(selector, /value="printers">الطابعات/);
  assert.match(selector, /value="inks">الأحبار/);
  assert.match(selector, /value="papers">الأوراق/);
  assert.equal((selector.match(/<option/g) ?? []).length, 4);
  assert.match(home, /searchProducts\([\s\S]*?searchScope/);
});

test("search uses real loaded products and normalized name, brand, type and category values", async () => {
  const [home, helper] = await Promise.all([read("app/home-client.tsx"), read("app/global-product-search.ts")]);
  assert.match(home, /searchProducts\(\s*products,/);
  assert.match(home, /getProductDisplayName\(product\)/);
  assert.match(home, /getHomeProductBrandLine\(product\)/);
  assert.match(home, /getHomeProductCategoryLine\(product\)/);
  assert.match(helper, /const WORD_SEPARATORS = \/\[-_–—\/\\\\\]\+\/g/);
  assert.match(helper, /queryTokens\.every\(\(token\) => haystack\.includes\(token\)\)/);
  assert.doesNotMatch(home, /mockSearch|searchMock|fakeResult/);
});

test("search results remain compact semantic links with states and complete focus handling", async () => {
  const home = await read("app/home-client.tsx");
  assert.match(home, /href=\{getProductDetailsHref\(product\)\} className="search-result-item"/);
  assert.match(home, /getHomeProductCategoryLine\(product\)/);
  assert.match(home, /ابدأ بالبحث عن منتج/);
  assert.match(home, /لا توجد نتائج مطابقة/);
  assert.match(home, /searchInputRef\.current\?\.focus\(\)/);
  assert.match(home, /if \(event\.key === "Escape"\)/);
  assert.match(home, /searchButton\?\.focus\(\)/);
  assert.match(home, /select:not\(\[disabled\]\), input:not\(\[disabled\]\)/);
});
