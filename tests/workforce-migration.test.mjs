import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20260722_classify_live_workforce_products.sql", import.meta.url);

test("uses a narrowly scoped and non-destructive WorkForce migration", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const normalized = migration.toLowerCase();

  assert.match(normalized, /update public\.products/);
  assert.match(normalized, /set category = 'workforce'/);
  assert.match(normalized, /where category = 'printers'/);
  assert.equal((normalized.match(/epson workforce pro/g) ?? []).length, 12);

  for (const forbidden of ["delete", "truncate", "drop table", "insert into", "create table", "alter table", "create or replace"]) {
    assert.equal(normalized.includes(forbidden), false, `forbidden migration statement: ${forbidden}`);
  }
});
