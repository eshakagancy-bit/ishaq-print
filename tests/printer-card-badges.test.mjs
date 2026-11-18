import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("printer cards suppress badges while preserving cart and favorite controls", async () => {
  const [home, category] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
  ]);
  assert.match(home, /product\.category !== "printers" && product\.badge\?\.trim\(\)/);
  assert.match(category, /category !== "printers" && product\.badge\?\.trim\(\)/);
  for (const source of [home, category]) {
    assert.match(source, /<ProductCardCartButton/);
    assert.match(source, /className=\{favorites\.includes\(product\.id\) \? "heart active" : "heart"\}/);
  }
});

test("new printer writes cannot create badges and edits preserve stored legacy values", async () => {
  const [route, database, admin, migration] = await Promise.all([
    read("app/api/site/route.ts"),
    read("lib/site-database.ts"),
    read("app/admin/admin-dashboard.tsx"),
    read("supabase/migrations/20261118090000_save_product_with_models.sql"),
  ]);
  assert.match(route, /badge: category === "printers" \? undefined/);
  assert.match(database, /badge: product\.category === "printers" \? null : row\.badge/);
  assert.match(migration, /badge = case when incoming\.category = any\(printer_categories\) then p\.badge else incoming\.badge end/);
  assert.match(admin, /badge: productForm\.category === "printers" \? undefined/);
  assert.match(admin, /productForm\.category === "papers" && <label>الشارة/);
});
