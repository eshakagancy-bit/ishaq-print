import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const expectedLabels = [
  "الكل (جميع الطابعات)",
  "WorkForce (طابعات الأعمال الشاقة)",
  "EcoTank (الطابعات المكتبية)",
  "EcoTank 6 Color (طابعات التصوير الفوتوغرافي)",
  "LQ (طابعات المستندات والفواتير)",
];

test("printer filter labels and order remain unchanged", async () => {
  const client = await readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8");
  const labelsBlock = client.match(/const printerFilterLabels[\s\S]*?\n};/)?.[0] ?? "";

  let previousIndex = -1;
  for (const label of expectedLabels) {
    const index = labelsBlock.indexOf(label);
    assert.ok(index > previousIndex, label);
    previousIndex = index;
  }
  assert.match(client, /aria-pressed=\{printerFilter === item\.value\}/);
  assert.match(client, /className=\{printerFilter === item\.value \? "active" : ""\}/);
});

test("responsive filter styling preserves full labels and horizontal touch scrolling", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(styles, /\.printer-category-filters button \{[^}]*flex:0 0 auto;[^}]*min-height:42px;[^}]*white-space:nowrap;/);
  assert.match(styles, /\.printer-category-filters button span,\.printer-category-filters button small \{[^}]*white-space:nowrap;/);
  assert.match(styles, /@media \(max-width:1000px\)[\s\S]*?\.printer-category-filters \{[^}]*overflow-x:auto;[^}]*touch-action:pan-x;/);
  assert.match(styles, /\.category-products-page \{[^}]*overflow-x:hidden;/);
});

test("search and printer taxonomy filtering remain combined and unchanged", async () => {
  const client = await readFile(new URL("../app/category-products-client.tsx", import.meta.url), "utf8");

  assert.match(client, /const matchesPrinterFilter = category !== "printers"[\s\S]*?resolvePrinterCategory\(product\.printerCategory, product\.name\) === printerFilter/);
  assert.match(client, /return matchesPrinterFilter && `\$\{product\.name\} \$\{product\.family\} \$\{product\.description\}`\.toLowerCase\(\)\.includes\(query\.toLowerCase\(\)\)/);
  assert.match(client, /\[ALL_PRINTERS_FILTER, \.\.\.PRINTER_CATEGORIES\]\.map/);
});
