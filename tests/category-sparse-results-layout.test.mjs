import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const client = readFileSync(new URL("../app/category-products-client.tsx", import.meta.url), "utf8");

test("one and three mobile printer results center the lone row without stretching", () => {
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?data-category="printers"[^}]*\.category-products-list \{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\);[^}]*gap:9px;/);
  assert.match(styles, /data-category="printers"[^}]*\.category-product-row:last-child:nth-child\(odd\) \{[^}]*width:calc\(\(100% - 9px\)\/2\);[^}]*grid-column:1 \/ -1;[^}]*justify-self:center;/);
});

test("two and larger result sets keep the shared list and source order", () => {
  assert.match(styles, /\.category-products-content \{ width:min\(920px,calc\(100% - 40px\)\);/);
  assert.match(styles, /\.category-products-list \{ display:flex; flex-direction:column; gap:18px; \}/);
  assert.match(client, /className="category-products-list"[^]*visibleProducts\.map\(\(product\) =>/);
  assert.match(client, /<article className="category-product-row" key=\{product\.id\}/);
  assert.doesNotMatch(client, /visibleProducts\.(?:sort|reverse|splice)\(/);
});

test("papers and inks keep the shared balanced row layout at every result count", () => {
  assert.doesNotMatch(styles, /data-category="(?:papers|inks)"[^}]*\.category-products-list/);
  assert.doesNotMatch(styles, /data-category="(?:papers|inks)"[^}]*\.category-product-row:last-child/);
  assert.match(client, /category === "printers" && <div className="printer-category-filters"/);
});

test("sparse-result styling does not remove card images or actions", () => {
  assert.match(client, /className="category-product-image"/);
  assert.match(client, /className="quick-view"/);
  assert.match(client, /className="category-product-actions"/);
  assert.match(client, /whatsappLink\(product\)/);
  assert.match(client, /toggleFavorite\(product\.id\)/);
});
