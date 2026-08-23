import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public collection search buttons open the shared drawer without navigation", async () => {
  const [client, drawer, printers, inks, papers] = await Promise.all([
    read("app/category-products-client.tsx"),
    read("app/global-search-drawer.tsx"),
    read("app/printers/page.tsx"),
    read("app/inks/page.tsx"),
    read("app/papers/page.tsx"),
  ]);
  assert.doesNotMatch(client, /href="\/#general-search"/);
  assert.match(client, /<PublicSearchControl products=\{allProducts\}\/>/);
  assert.match(drawer, /const openSearch = \(\) => \{ announceHeaderDrawer\("search"\); setOpen\(true\); \}/);
  assert.match(drawer, /id="search-drawer"[\s\S]*?id="global-search-scope"[\s\S]*?id="global-search-input"/);
  assert.match(drawer, /event\.key === "Escape"/);
  assert.match(drawer, /event\.target === event\.currentTarget\) close\(\)/);
  for (const source of [printers, inks, papers]) assert.match(source, /allProducts=\{data\.products\}/);
});

test("categories and product details expose the same public search control", async () => {
  const sources = await Promise.all([
    read("app/categories/page.tsx"),
    read("app/printers/[slug]/page.tsx"),
    read("app/inks/[slug]/page.tsx"),
    read("app/papers/[slug]/page.tsx"),
  ]);
  for (const source of sources) assert.match(source, /<PublicSearchControl products=\{/);
});
