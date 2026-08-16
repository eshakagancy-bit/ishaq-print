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
  assert.match(modal, /const summaryRows = rows\.slice\(0, 5\)/);
  assert.match(modal, /summaryRows\.length > 0/);
  assert.match(modal, /<InkImageCarousel images=\{availableImages\}/);
  assert.match(modal, /event\.key === "Escape"/);
  assert.match(modal, /className="modal-backdrop" onMouseDown=\{onClose\}/);
});

test("ink specification builder keeps every populated field for full details", async () => {
  const specifications = await read("app/ink-specifications.ts");
  for (const key of ["brand", "ink-type", "color-count", "capacities", "compatible-printers", "features", "uses"]) {
    assert.match(specifications, new RegExp(`key: "${key}"`));
  }
});

test("product cards keep quick view isolated while their main surfaces open product details", async () => {
  const [home, categories, modal] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
    read("app/quick-view-modal.tsx"),
  ]);
  assert.doesNotMatch(home, /window\.location\.href = `\/papers\/\$\{getPaperSlug\(product\)\}`/);
  assert.doesNotMatch(home, /window\.location\.href = `\/inks\/\$\{getInkSlug\(product\)\}`/);
  assert.match(home, /className="product-card-link" href=\{detailsHref\}/);
  assert.match(home, /className="quick-view" onClick=\{\(event\) => openQuickView\(product, event\.currentTarget\)\}/);
  assert.match(categories, /className="category-product-row"[\s\S]*?role="link"[\s\S]*?tabIndex=\{0\}/);
  assert.match(categories, /if \(!\(event\.target as HTMLElement\)\.closest\("button,a"\)\) router\.push\(detailsHref\)/);
  assert.match(categories, /event\.target === event\.currentTarget && event\.key === "Enter"[\s\S]*?router\.push\(detailsHref\)/);
  assert.match(categories, /<Link className="product-image-link" href=\{detailsHref\}>/);
  assert.match(categories, /<h2><Link href=\{detailsHref\}>/);
  assert.match(categories, /className="quick-view" onClick=\{\(event\) => openQuickView\(product, event\.currentTarget\)\}/);
  assert.doesNotMatch(categories, /onClick=\{[^}]*openQuickView\(product, event\.currentTarget\)[^}]*\}[^>]*>\s*<div className="category-product-image"/);
  assert.doesNotMatch(categories, /<Link href=\{`\/\$\{category\}\/\$\{slug\}`\}/);
  assert.doesNotMatch(categories, /فتح صفحة التفاصيل/);
  assert.match(modal, /className="secondary-btn modal-more-details" href=\{detailsHref\}/);
});
