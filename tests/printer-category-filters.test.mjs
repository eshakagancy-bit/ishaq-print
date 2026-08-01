import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("printer filters use the stored taxonomy only on the vertical printers page", async () => {
  const [client, categories, styles, home] = await Promise.all([
    readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/printer-categories.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(client, /useState<PrinterCategoryFilter>\(ALL_PRINTERS_FILTER\.value\)/);
  assert.match(client, /category === "printers" && <div className="printer-category-filters"/);
  assert.match(client, /resolvePrinterCategory\(product\.printerCategory, product\.name\) === printerFilter/);
  assert.match(client, /\[ALL_PRINTERS_FILTER, \.\.\.PRINTER_CATEGORIES\]\.map/);
  assert.match(client, /لا توجد طابعات في هذا التصنيف حاليًا/);
  assert.match(categories, /value: "workforce"[\s\S]*value: "ecotank"[\s\S]*value: "ecotank-6-color"[\s\S]*value: "lq"/);
  assert.match(styles, /\.printer-category-filters \{[^}]*max-width:100%;[^}]*display:flex;[^}]*overflow-x:auto;/);
  assert.match(styles, /\.category-products-list \{ display:flex; flex-direction:column;/);
  assert.doesNotMatch(home, /printer-category-filters/);
});
