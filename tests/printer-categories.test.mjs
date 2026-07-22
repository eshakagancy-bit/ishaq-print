import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PRINTER_CATEGORIES } from "../app/printer-categories.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("defines printer categories once and shares them with customer and admin interfaces", async () => {
  const [shared, home, admin] = await Promise.all([
    read("app/printer-categories.ts"),
    read("app/home-client.tsx"),
    read("app/admin/admin-dashboard.tsx"),
  ]);

  for (const { value, label } of PRINTER_CATEGORIES) {
    assert.match(shared, new RegExp(`value: "${value}"`));
    assert.match(shared, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.equal(home.includes(label), false, `${label} must come from the shared list`);
    assert.equal(admin.includes(label), false, `${label} must come from the shared list`);
  }

  assert.match(home, /\[ALL_PRINTERS_FILTER, \.\.\.PRINTER_CATEGORIES\]/);
  assert.match(admin, /PRINTER_CATEGORIES\.map/);
});

test("filters by stable values and requires an Arabic category selection in admin", async () => {
  const [home, admin] = await Promise.all([
    read("app/home-client.tsx"),
    read("app/admin/admin-dashboard.tsx"),
  ]);

  assert.match(home, /product\.printerCategory === filter/);
  assert.match(home, /filter === ALL_PRINTERS_FILTER\.value/);
  assert.match(admin, /value=\{productForm\.printerCategory \?\? ""\}/);
  assert.match(admin, /required/);
  assert.match(admin, /يرجى اختيار فئة الطابعة قبل إضافة المنتج\./);
});

test("maps printer categories to database values and migrates existing WorkForce products", async () => {
  const [database, migration] = await Promise.all([
    read("lib/site-database.ts"),
    read("supabase/migrations/20260722_classify_live_workforce_products.sql"),
  ]);

  assert.match(database, /category: printerCategory \?\? product\.category/);
  assert.match(database, /const storedPrinterCategory = isPrinterCategory\(row\.category\)/);
  assert.match(migration, /set category = 'workforce'/);
  assert.equal((migration.match(/Epson WorkForce Pro/g) ?? []).length, 12);
});
