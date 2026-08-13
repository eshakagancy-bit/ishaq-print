import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const defaults = readFileSync(new URL("../app/site-defaults.ts", import.meta.url), "utf8");
const home = readFileSync(new URL("../app/home-client.tsx", import.meta.url), "utf8");
const category = readFileSync(new URL("../app/category-products-client.tsx", import.meta.url), "utf8");

test("shared product names and technical values use plaintext bidi isolation", () => {
  assert.match(styles, /\.product-family,\.product-body h3,\.category-product-content h2,\.modal-content h2,\.modal-specs dd,\.printer-key-info dd,\.printer-spec-table td,\.printer-summary h1,\.product-details-breadcrumb b,\.similar-printers b \{ unicode-bidi:plaintext; \}/);
  assert.doesNotMatch(styles, /(?:product-body h3|category-product-content h2|modal-content h2|printer-summary h1)[^}]*direction:ltr/);
  assert.match(styles, /\.product-body h3 \{[^}]*text-align:start;/);
  assert.match(styles, /\.category-product-content h2 \{[^}]*text-align:start;/);
});

test("technical model, format and capacity values remain unchanged", () => {
  for (const value of ["WorkForce", "A4", "A3"]) {
    assert.match(defaults, new RegExp(value.replace(/[+]/g, "\\+")));
  }
  assert.doesNotMatch(`${home}\n${category}`, /replaceAll?\([^)]*(?:LQ-350|WF-C5890|A3\+|A4|EcoTank|WorkForce|DTF|Pigment)/);
  assert.match(home, /getProductDisplayName\(product\)/);
  assert.match(category, /displayName\(product\)/);
});
