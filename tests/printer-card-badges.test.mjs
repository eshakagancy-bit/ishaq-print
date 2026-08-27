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
  const [route, database, admin] = await Promise.all([
    read("app/api/site/route.ts"),
    read("lib/site-database.ts"),
    read("app/admin/admin-dashboard.tsx"),
  ]);
  assert.match(route, /badge: category === "printers" \? undefined/);
  assert.match(database, /badge: product\.category === "printers" \? undefined : product\.badge/);
  assert.match(database, /filter\(\(\[key\]\) => key !== "badge"\)/);
  assert.match(admin, /badge: productForm\.category === "printers" \? undefined/);
  assert.match(admin, /productForm\.category === "papers" && <label>الشارة/);
});
