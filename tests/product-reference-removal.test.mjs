import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const removedFeaturePattern = /referenceNumber|reference_number|الرقم المرجعي|مرجع المنتج|product-reference/;

test("product reference number is absent from every user-facing product surface", async () => {
  const paths = [
    "app/admin/admin-dashboard.tsx",
    "app/global-search-drawer.tsx",
    "app/home-client.tsx",
    "app/quick-view-modal.tsx",
    "app/product-share.tsx",
    "app/product-sharing.ts",
    "app/printers/[slug]/page.tsx",
    "app/inks/[slug]/page.tsx",
    "app/papers/[slug]/page.tsx",
  ];

  for (const path of paths) {
    assert.doesNotMatch(await read(path), removedFeaturePattern, path);
  }
});

test("product reference number is absent from API contracts, storage mapping, and fresh setup", async () => {
  const paths = [
    "app/api/site/route.ts",
    "app/api/site/validation.ts",
    "app/site-defaults.ts",
    "lib/site-database.ts",
    "supabase/setup.sql",
  ];

  for (const path of paths) {
    assert.doesNotMatch(await read(path), removedFeaturePattern, path);
  }
});

test("removal migration refuses data loss and then removes all database artifacts", async () => {
  const migration = await read("supabase/migrations/20260823090000_remove_product_reference_number.sql");
  assert.match(migration, /where reference_number is not null/);
  assert.match(migration, /raise exception 'cannot remove product reference numbers while values still exist'/);
  assert.match(migration, /drop index if exists public\.products_reference_number_ci_uidx/);
  assert.match(migration, /drop constraint if exists products_reference_number_valid/);
  assert.match(migration, /drop column if exists reference_number/);
  assert.doesNotMatch(migration, /item\.reference_number/);
});
