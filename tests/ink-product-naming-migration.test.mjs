import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getInkProductNameError } from "../app/ink-specifications.ts";

const migrationUrl = new URL("../supabase/migrations/20260804_standardize_ink_product_names.sql", import.meta.url);

test("standardizes exactly the thirteen current ink products without replacing specifications", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const rows = [...migration.matchAll(/\(\d+,\s*'[^']+',\s*'([^']+)',\s*array\[([^\]]+)]::text\[]\)/g)];

  assert.equal(rows.length, 13);
  for (const [, name, rawCapacities] of rows) {
    const capacities = [...rawCapacities.matchAll(/'([^']+)'/g)].map((match) => match[1]);
    assert.equal(getInkProductNameError(name, capacities), null, name);
  }
  assert.match(migration, /target_count <> 13 or safe_count <> 13/);
  assert.match(migration, /verified_count <> 13/);
  assert.match(migration, /get diagnostics updated_count = row_count/);
  assert.match(migration, /targeted: %, modified: %, verified: %/);
  assert.match(migration, /product\.name in \(approved\.old_name, approved\.new_name\)/);
  assert.match(migration, /jsonb_set\(\s*coalesce\(product\.specifications/);
  assert.doesNotMatch(migration, /\bdelete\b/i);
  assert.doesNotMatch(migration, /set\s+specifications\s*=\s*approved\./i);
});
