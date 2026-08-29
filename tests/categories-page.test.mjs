import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("categories and homepage reuse the exact shared category artwork links", async () => {
  const [page, home, component, styles] = await Promise.all([
    read("app/categories/page.tsx"),
    read("app/home-client.tsx"),
    read("app/storefront-category-links.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(page, /<StorefrontCategoryLinks\/>/);
  assert.match(home, /<StorefrontCategoryLinks\/>/);
  assert.match(component, /STOREFRONT_CATEGORY_ORDER: PublicEnabledCategory\[\] = \["printers", "inks", "papers"\]/);
  assert.match(component, /printers:\s*"\/categories\/printers-unified\.png"/);
  assert.match(component, /inks:\s*"\/categories\/inks-unified\.png"/);
  assert.match(component, /papers:\s*"\/categories\/papers-unified\.png"/);
  assert.match(component, /className="storefront-category-card"/);
  assert.match(component, /className="storefront-category-image"/);
  assert.match(component, /href=\{PUBLIC_CATEGORY_DETAILS\[categoryId\]\.href\}/);
  assert.match(component, /<h3>\{PUBLIC_CATEGORY_DETAILS\[categoryId\]\.label\}<\/h3>/);
  assert.doesNotMatch(page, /categories-index-card|categories-index-image|categories-index-card-content|\.count|عرض المنتجات/);
  assert.doesNotMatch(styles, /\.categories-index-(?:grid|card|image|card-content)/);
});

test("categories keeps its heading while shared links retain homepage responsiveness", async () => {
  const [page, component, styles] = await Promise.all([
    read("app/categories/page.tsx"),
    read("app/storefront-category-links.tsx"),
    read("app/globals.css"),
  ]);

  assert.match(page, /className="collection-breadcrumb"/);
  assert.match(page, /<div className="categories-index-title"><span>أقسام المنتجات<\/span><h1>تسوق حسب الفئة<\/h1><p>اختر القسم الذي تريد تصفحه<\/p><\/div>/);
  assert.match(component, /sizes="\(max-width: 760px\) 28vw/);
  assert.match(styles, /\.storefront-category-grid \{ display:grid; grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(styles, /@media \(max-width:760px\)[\s\S]*?\.storefront-category-image \{ width:min\(100%,108px\); \}/);
  assert.match(styles, /@media \(hover:hover\) and \(pointer:fine\) \{ \.storefront-category-card:hover/);
});
