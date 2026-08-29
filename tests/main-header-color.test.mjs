import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("every storefront main header uses the shared solid cyan background", async () => {
  const [styles, home, collections, categories, printer, ink, paper] = await Promise.all([
    read("app/globals.css"),
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
    read("app/categories/page.tsx"),
    read("app/printers/[slug]/page.tsx"),
    read("app/inks/[slug]/page.tsx"),
    read("app/papers/[slug]/page.tsx"),
  ]);

  assert.match(styles, /--main-header-background:#0ca1c1/);
  assert.match(styles, /\.header \{[^}]*background:var\(--main-header-background\)/);
  assert.match(styles, /\.category-products-header,\.categories-index-header \{[^}]*background:var\(--main-header-background\)/);
  assert.match(styles, /\.printer-details-header \{[^}]*background:var\(--main-header-background\)/);
  assert.match(styles, /\.printer-details-header \.printer-back-link \{ color:var\(--store-navy\); \}/);
  assert.match(home, /<header className="header">/);
  assert.match(collections, /className="category-products-header"/);
  assert.match(categories, /className="categories-index-header"/);
  for (const details of [printer, ink, paper]) assert.match(details, /className="printer-details-header"/);
});
