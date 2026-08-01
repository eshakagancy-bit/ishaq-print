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
  assert.match(client, /onClick=\{\(\) => openQuickView\(product\)\}>تفاصيل سريعة/);
  assert.match(client, /اطلب من المختص/);
  assert.match(client, /فتح صفحة التفاصيل/);
  assert.match(home, /className="category-all-link" href=\{`\/\$\{activeCategory\}`\}>الكل/);
  assert.match(home, /homeCategoryOrder: CategoryId\[\] = \["printers", "papers", "inks"\]/);
  assert.match(home, /className={`home-category-row\$\{hintClass\}`}/);
  assert.match(styles, /\.home-category-row\.has-more \{ display:flex; overflow-x:auto; scroll-snap-type:x mandatory;/);
});

test("the home carousel only shows a next-card hint when another group exists", async () => {
  const [home, styles] = await Promise.all([
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(home, /productGroups\.length > 1 \? "product-grid has-more" : "product-grid"/);
  assert.match(styles, /\.product-grid\.has-more \.product-group \{ flex-basis:calc\(100% - 52px\); \}/);
  assert.match(styles, /scroll-snap-align:start/);
});
