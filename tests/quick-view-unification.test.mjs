import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("printers, inks and papers share one quick-view modal with category-specific links", async () => {
  const [home, categories, modal] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
    read("app/quick-view-modal.tsx"),
  ]);
  assert.match(home, /<QuickViewModal/);
  assert.match(categories, /<QuickViewModal/);
  assert.match(home, /`\/printers\/\$\{getPrinterSlug\(selected\)\}`/);
  assert.match(home, /`\/inks\/\$\{getInkSlug\(selected\)\}`/);
  assert.match(home, /`\/papers\/\$\{getPaperSlug\(selected\)\}`/);
  assert.match(modal, /rows\.length > 0/);
  assert.match(modal, /<InkImageCarousel images=\{images\.length \? images : \[""\]\}/);
  assert.match(modal, /event\.key === "Escape"/);
  assert.match(modal, /className="modal-backdrop" onMouseDown=\{onClose\}/);
});

test("ink quick view includes every populated structured field", async () => {
  const specifications = await read("app/ink-specifications.ts");
  for (const key of ["brand", "ink-type", "color-count", "capacities", "compatible-printers", "features", "uses"]) {
    assert.match(specifications, new RegExp(`key: "${key}"`));
  }
});

test("all product cards open quick view without direct paper or ink navigation", async () => {
  const [home, categories, modal] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
    read("app/quick-view-modal.tsx"),
  ]);
  assert.doesNotMatch(home, /window\.location\.href = `\/papers\/\$\{getPaperSlug\(product\)\}`/);
  assert.doesNotMatch(home, /window\.location\.href = `\/inks\/\$\{getInkSlug\(product\)\}`/);
  assert.match(home, /className="product-card"[\s\S]*?onClick=\{\(event\) => \{ if \(!\(event\.target as HTMLElement\)\.closest\("button,a"\)\) openQuickView\(product, event\.currentTarget\); \}\}/);
  assert.match(categories, /className="category-product-row"[\s\S]*?openQuickView\(product, event\.currentTarget\)/);
  assert.doesNotMatch(categories, /<Link href=\{`\/\$\{category\}\/\$\{slug\}`\}/);
  assert.doesNotMatch(categories, /فتح صفحة التفاصيل/);
  assert.match(modal, /className="secondary-btn modal-more-details" href=\{detailsHref\}/);
});
