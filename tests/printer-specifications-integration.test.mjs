import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("uses an independent additive database migration without changing product rows", async () => {
  const migration = (await read("supabase/migrations/20260722_add_printer_specifications.sql")).toLowerCase();
  assert.match(migration, /add column if not exists specifications jsonb/);
  assert.match(migration, /specifications_source_url text/);
  assert.match(migration, /specifications_verified_at timestamptz/);
  assert.match(migration, /jsonb_typeof\(specifications\) = 'object'/);
  for (const forbidden of ["delete", "truncate", "update public.products", "insert into public.products", "drop table"]) {
    assert.equal(migration.includes(forbidden), false, `forbidden migration operation: ${forbidden}`);
  }
});

test("maps structured specifications through API and database compatibility layers", async () => {
  const [database, api, types] = await Promise.all([
    read("lib/site-database.ts"),
    read("app/api/site/route.ts"),
    read("app/site-defaults.ts"),
  ]);
  for (const source of [database, api, types]) assert.match(source, /specifications/);
  assert.match(database, /specifications_source_url/);
  assert.match(database, /specifications_verified_at/);
  assert.match(api, /normalizePrinterSpecifications\(input\.specifications\)/);
  assert.match(api, /description: String\(input\.description/);
  assert.match(api, /slice\(0, 1200\)/);
});

test("admin provides structured choices, tri-state fields, conditional LQ fields and description validation", async () => {
  const [admin, shared] = await Promise.all([
    read("app/admin/admin-dashboard.tsx"),
    read("app/printer-specifications.ts"),
  ]);
  for (const expected of ["مقاس الورق", "نوع الطابعة", "الوظائف", "عدد الإبر", "عدد أعمدة الطباعة", "عمر الشريط", "160 حرفاً"]) {
    assert.match(admin, new RegExp(expected));
  }
  assert.match(admin, /const isLq = product\.printerCategory === "lq"/);
  assert.match(admin, /value=\{triStateToFormValue\(value\)\}/);
  assert.match(admin, /product\.specifications \?\? createEmptyPrinterSpecifications\(\)/);
  assert.doesNotMatch(admin, /specifications: product\.specifications \?\? createEmptyPrinterSpecifications\(\)/);
  for (const expected of ["Wi-Fi", "Ethernet", "USB", "حرف/ثانية", "اطلب عرض سعر"]) {
    assert.match(shared, new RegExp(expected));
  }
});

test("customer card stays concise and quick view renders only prepared specification rows", async () => {
  const home = await read("app/home-client.tsx");
  const cardStart = home.indexOf("const cardTags = getProductCardSpecificationTags(product)");
  const cardEnd = home.indexOf("</article>;", cardStart);
  const card = home.slice(cardStart, cardEnd);
  assert.match(card, /product\.image/);
  assert.match(card, /product\.badge/);
  assert.match(card, /product\.family/);
  assert.match(card, /product\.name/);
  assert.match(card, /product\.description/);
  assert.match(card, /cardTags/);
  assert.match(card, /product\.price/);
  assert.equal(card.includes("product.features.map"), false);
  assert.match(home, /selectedSpecificationRows\.map/);
});
