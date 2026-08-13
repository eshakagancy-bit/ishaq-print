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
  assert.match(client, /category === "printers" && <><div className=\{filtersOpen/);
  assert.match(client, /resolvePrinterCategory\(product\.printerCategory, product\.name\) === printerFilter/);
  assert.match(client, /\[ALL_PRINTERS_FILTER, \.\.\.PRINTER_CATEGORIES\]\.map/);
  for (const label of [
    "الكل (جميع الطابعات)",
    "WorkForce (طابعات الأعمال الشاقة)",
    "EcoTank (الطابعات المكتبية)",
    "EcoTank 6 Color (طابعات التصوير الفوتوغرافي)",
    "LQ (طابعات المستندات والفواتير)",
  ]) assert.match(client, new RegExp(label.replace(/[()]/g, "\\$&")));
  assert.match(client, /printerFilterLabels\[item\.value\]/);
  assert.match(client, /Boolean\(trimmedQuery\) && hasActivePrinterFilter && visibleProducts\.length === 0/);
  assert.match(client, /لا توجد نتائج لـ «\$\{trimmedQuery\}» ضمن فلتر \$\{printerFilterLabels\[printerFilter\]\}/);
  assert.match(client, /onClick=\{clearPrinterFilters\}>مسح الفلاتر/);
  assert.match(client, /const clearPrinterFilters = \(\) => setPrinterFilter\(ALL_PRINTERS_FILTER\.value\)/);
  assert.match(client, /onClick=\{showAllProducts\}>عرض كل المنتجات/);
  assert.match(client, /const showAllProducts = \(\) => \{\s*setPrinterFilter\(ALL_PRINTERS_FILTER\.value\);\s*setQuery\(""\);\s*\}/);
  assert.match(client, /filteredSearchHasNoResults \? [\s\S]* : <div className="empty-state"><b>\{query \? "لا توجد نتائج مطابقة"/);
  assert.match(client, /لا توجد طابعات في هذا التصنيف حاليًا/);
  assert.match(categories, /value: "workforce"[\s\S]*value: "ecotank"[\s\S]*value: "ecotank-6-color"[\s\S]*value: "lq"/);
  assert.match(styles, /\.printer-category-filters \{[^}]*width:100%;[^}]*max-width:100%;[^}]*min-width:0;[^}]*display:flex;[^}]*flex-wrap:wrap;[^}]*overflow-x:visible;/);
  assert.match(styles, /\.printer-category-filters button span,\.printer-category-filters button small \{[^}]*flex:0 0 auto;[^}]*white-space:nowrap;/);
  assert.match(styles, /@media \(max-width:1000px\)[\s\S]*?\.printer-category-filters \{[^}]*flex-wrap:nowrap;[^}]*overflow-x:auto;[^}]*overscroll-behavior-inline:contain;[^}]*touch-action:pan-x;[^}]*-webkit-overflow-scrolling:touch;/);
  assert.match(styles, /\.printer-category-filters button\.active \{[^}]*background:var\(--navy\);[^}]*color:#fff;/);
  assert.match(styles, /\.category-products-list \{ display:grid; grid-template-columns:repeat\(auto-fill,minmax\(230px,1fr\)\)/);
  assert.doesNotMatch(home, /printer-category-filters/);
});
