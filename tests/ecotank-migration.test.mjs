import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20260722090100_classify_live_ecotank_products.sql", import.meta.url);

test("keeps the EcoTank migration exact, transactional and category-only", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const normalized = migration.toLowerCase();

  assert.match(normalized, /begin;/);
  assert.match(normalized, /commit;/);
  assert.equal((normalized.match(/update public\.products/g) ?? []).length, 1);
  assert.match(normalized, /set category = approved\.target_category/);
  assert.match(normalized, /product\.name = approved\.name/);
  assert.match(normalized, /product\.category = approved\.source_category/);
  assert.equal((migration.match(/EPSON EcoTank L(?:8180|8050|18050|6490|6270|4260|11050|3250|3210|15150)/g) ?? []).length >= 30, true);

  for (const forbidden of ["delete", "truncate", "drop table", "insert into", "create table", "alter table", "create or replace"]) {
    assert.equal(normalized.includes(forbidden), false, `forbidden migration statement: ${forbidden}`);
  }
});
