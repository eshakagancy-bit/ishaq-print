import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("quick view omits an empty image area and keeps the primary image fallback", async () => {
  const [modal, home, categories, carousel, styles] = await Promise.all([
    readFile(new URL("../app/quick-view-modal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ink-image-carousel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(modal, /images\.map\(\(image\) => image\.trim\(\)\)\.filter\(Boolean\)/);
  assert.match(modal, /availableImages\.length > 0 && <div className="modal-image">/);
  assert.match(modal, /className=\{`product-modal\$\{availableImages\.length > 0 \? "" : " no-image"\}`\}/);
  assert.doesNotMatch(modal, /images\.length \? images : \[""\]/);
  assert.match(home, /images=\{selected\.images\?\.length \? selected\.images : \[selected\.image\]\}/);
  assert.match(categories, /: \[selected\.image\]\} rows=\{selectedRows\}/);
  assert.match(carousel, /const resolvedImage = failedImage === activeImage \? "\/brand\/eshak-logo\.png" : activeImage/);
  assert.match(styles, /\.product-modal\.no-image \{ grid-template-columns:1fr; \}/);
});

test("quick view shows at most five category-specific rows while detail pages keep all rows", async () => {
  const [modal, home, categories, printerDetails, paperDetails, inkDetails] = await Promise.all([
    readFile(new URL("../app/quick-view-modal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/printers/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/papers/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/inks/[slug]/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(modal, /const summaryRows = rows\.slice\(0, 5\)/);
  assert.match(modal, /summaryRows\.map\(\(row\)/);
  assert.match(home, /buildInkSpecificationRows\(selected\)[\s\S]*?buildPaperSpecificationRows\(selected\)[\s\S]*?buildQuickViewSpecificationRows\(selected\)/);
  assert.match(categories, /buildInkSpecificationRows\(selected\)[\s\S]*?buildPaperSpecificationRows\(selected\)[\s\S]*?buildQuickViewSpecificationRows\(selected\)/);
  assert.match(printerDetails, /const specificationRows = buildQuickViewSpecificationRows\(product\)/);
  assert.match(paperDetails, /const rows = buildPaperSpecificationRows\(product\)/);
  assert.match(inkDetails, /const rows = buildInkSpecificationRows\(product\)/);
  assert.doesNotMatch(`${printerDetails}\n${paperDetails}\n${inkDetails}`, /rows\.slice\(0, 5\)/);
});

test("quick view keeps its commercial and details actions", async () => {
  const [modal, home, categories] = await Promise.all([
    readFile(new URL("../app/quick-view-modal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(modal, /className="secondary-btn modal-more-details" href=\{detailsHref\}>تفاصيل أكثر/);
  assert.match(modal, /className="primary-btn" href=\{whatsappHref\}/);
  assert.match(home, /whatsappLabel="اعرف السعر والتوفر"/);
  assert.match(categories, /whatsappLabel="اعرف السعر والتوفر"/);
});
