import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("all public storefront headers reuse the cyan shared top bar", async () => {
  const [css, component, home, collections, categories, printer, ink, paper] = await Promise.all([
    read("app/globals.css"),
    read("app/public-topbar.tsx"),
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
    read("app/categories/page.tsx"),
    read("app/printers/[slug]/page.tsx"),
    read("app/inks/[slug]/page.tsx"),
    read("app/papers/[slug]/page.tsx"),
  ]);

  assert.match(css, /\.topbar \{ background:#0ca1c1; color:#fff; font-size:12px; \}/);
  assert.doesNotMatch(css, /\.topbar \{ background:var\(--(?:store-)?navy\)/);
  assert.match(component, /className="topbar"/);
  for (const source of [home, collections, categories, printer, ink, paper]) {
    assert.match(source, /<PublicTopBar settings=\{/);
  }
});
