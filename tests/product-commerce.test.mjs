import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { productPriceLabel } from "../app/product-commerce.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("price labels use only stored values or the on-request label", () => {
  assert.equal(productPriceLabel(undefined), "السعر عند الطلب");
  assert.equal(productPriceLabel(""), "السعر عند الطلب");
  assert.equal(productPriceLabel(" 1,250 ريال "), "1,250 ريال");
  assert.match(read("supabase/setup.sql"), /price text/);
  assert.match(read("app/quick-view-modal.tsx"), /productPriceLabel\(price\)/);
});

test("availability is not invented and the collection CTA opens product details", () => {
  const home = read("app/home-client.tsx");
  const category = read("app/category-products-client.tsx");
  assert.doesNotMatch(home, />متوفر</);
  assert.doesNotMatch(category, />متوفر</);
  assert.match(category, /<Link href=\{detailsHref\}>لمعرفة المزيد<\/Link>/);
  assert.match(home, /whatsappLabel="اعرف السعر والتوفر"/);
  assert.match(read("app/paper-specifications.ts"), /specifications\.availability \? \{ key: "availability", label: "التوفر"/);
});
