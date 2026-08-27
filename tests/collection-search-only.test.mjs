import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared collection pages keep search immediately before the product grid", async () => {
  const client = await read("app/category-products-client.tsx");
  const searchIndex = client.indexOf('<label className="category-products-search">');
  const gridIndex = client.indexOf('visibleProducts.length ? <div className="category-products-list">');
  assert.ok(searchIndex > 0);
  assert.ok(gridIndex > searchIndex);
  const between = client.slice(searchIndex, gridIndex);
  assert.doesNotMatch(between, /collection-toolbar|filter-toggle|collection-sort|collection-result-count|printer-category-filters/);
  assert.match(client, /const normalizedQuery = query\.trim\(\)\.toLocaleLowerCase\("ar"\)/);
  assert.match(client, /products\.filter\(\(product\) => `\$\{product\.name\} \$\{product\.family\} \$\{product\.description\}`\.toLocaleLowerCase\("ar"\)\.includes\(normalizedQuery\)\)/);
});

test("collection filter, sorting and product count UI and styles are removed", async () => {
  const [client, styles] = await Promise.all([read("app/category-products-client.tsx"), read("app/globals.css")]);
  for (const removed of [
    "SortMode", "sortMode", "printerFilter", "filtersOpen", "فلترة", "ترتيب حسب", "الافتراضي",
    "collection-toolbar", "filter-toggle", "collection-sort", "collection-result-count", "printer-category-filters",
  ]) {
    assert.equal(client.includes(removed), false, `client still contains ${removed}`);
  }
  for (const removedClass of ["collection-toolbar", "filter-toggle", "collection-sort", "collection-result-count", "printer-category-filters", "collection-filter-backdrop"]) {
    assert.equal(styles.includes(`.${removedClass}`), false, `styles still contain ${removedClass}`);
  }
  assert.doesNotMatch(client, /\{products\.length\}[^\n]*(?:منتج|نتيجة)/);
});
