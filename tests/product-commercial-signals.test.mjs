import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("paper availability is the only commercial availability source", async () => {
  const [paperSpecifications, home, category, quickView, printerDetails, inkDetails, paperDetails] = await Promise.all([
    read("app/paper-specifications.ts"),
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
    read("app/quick-view-modal.tsx"),
    read("app/printers/[slug]/page.tsx"),
    read("app/inks/[slug]/page.tsx"),
    read("app/papers/[slug]/page.tsx"),
  ]);
  assert.match(paperSpecifications, /export function getPaperAvailabilityLabel/);
  assert.match(paperSpecifications, /availability \? availabilityLabels\[availability\] : null/);
  assert.match(home, /selected\.category === "papers" \? getPaperAvailabilityLabel\(selected\) : null/);
  assert.match(category, /category === "papers" && getPaperAvailabilityLabel\(product\)/);
  assert.match(quickView, /availabilityLabel\?\.trim\(\)/);
  assert.match(paperDetails, /getPaperAvailabilityLabel\(product\)/);
  assert.doesNotMatch(printerDetails, /حالة التوفر|تُؤكّد عند الطلب|data-availability/);
  assert.doesNotMatch(inkDetails, /data-availability|getPaperAvailabilityLabel/);
});

test("existing badges remain data-driven and no unsupported claims are generated", async () => {
  const [home, category, quickView] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
    read("app/quick-view-modal.tsx"),
  ]);
  for (const source of [home, category, quickView]) assert.match(source, /product\.badge|badge\?\.trim/);
  assert.doesNotMatch(`${home}\n${category}\n${quickView}`, /bestseller|isNew|featured\s*\?|warranty/);
  const cardStart = home.indexOf("const renderProductCard");
  const card = home.slice(cardStart, home.indexOf("return (", cardStart));
  assert.doesNotMatch(card, />اعرف السعر والتوفر</);
  assert.match(category, />اعرف السعر والتوفر</);
});
