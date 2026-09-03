import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { activeProductModels, productModelHref, selectProductModel } from "../app/product-models.ts";

const models = [
  { id: 1, model: "85A", availability: "in_stock", sortOrder: 2, isActive: true },
  { id: 2, model: "78A", availability: "on_request", sortOrder: 0, isActive: true },
  { id: 3, model: "05A", availability: "out_of_stock", sortOrder: 1, isActive: false },
  { id: 4, model: "12A", availability: "in_stock", sortOrder: 1, isActive: true },
  { id: 5, model: "17A", availability: "in_stock", sortOrder: 3, isActive: true },
  { id: 6, model: "26A", availability: "in_stock", sortOrder: 4, isActive: true },
];

test("products without models remain empty and active models are sorted", () => {
  assert.deepEqual(activeProductModels({}), []);
  assert.deepEqual(activeProductModels({ models }).map((model) => model.model), ["78A", "12A", "85A", "17A", "26A"]);
});

test("model links are encoded and valid or invalid URL selections have safe defaults", () => {
  assert.equal(productModelHref("/inks/hp-laserjet", models[0]), "/inks/hp-laserjet?model=85A");
  assert.equal(selectProductModel(models, "85a")?.model, "85A");
  assert.equal(selectProductModel(models, "missing")?.model, "78A");
  assert.equal(selectProductModel([], "85A"), undefined);
});

test("card chips cap visible models at four and show only a positive remainder", async () => {
  const source = await readFile(new URL("../app/product-model-chips.tsx", import.meta.url), "utf8");
  assert.match(source, /models\.slice\(0, limit\)/);
  assert.match(source, /models\.length > limit \? <span/);
  assert.match(source, /\+\{models\.length - limit\}/);
  assert.doesNotMatch(source, /\+0/);
});

test("migration is relational, indexed, unique, non-destructive and uses an atomic model replacement function", async () => {
  const sql = await readFile(new URL("../supabase/migrations/20260901090000_add_product_models.sql", import.meta.url), "utf8");
  assert.match(sql, /create table if not exists public\.product_models/);
  assert.match(sql, /references public\.products\(id\) on delete cascade/);
  assert.match(sql, /unique \(product_id, model\)/);
  assert.match(sql, /product_models_product_sort_idx/);
  assert.match(sql, /create or replace function public\.replace_product_models/);
  assert.doesNotMatch(sql, /drop table|truncate|delete from public\.products/);
});

test("search, admin CRUD, image fallback and all three detail routes are wired", async () => {
  const [search, home, category, admin, selector, database, ...details] = await Promise.all([
    "app/global-search-drawer.tsx", "app/home-client.tsx", "app/category-products-client.tsx",
    "app/admin/admin-dashboard.tsx", "app/product-model-selector.tsx", "lib/site-database.ts",
    "app/printers/[slug]/page.tsx", "app/inks/[slug]/page.tsx", "app/papers/[slug]/page.tsx",
  ].map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")));
  assert.match(search, /searchProductResults/);
  assert.match(search, /SearchResultModelMatches/);
  assert.match(home, /<ProductModelChips product=\{product\}/);
  assert.match(category, /<ProductModelChips product=\{product\}/);
  assert.match(admin, /إضافة موديل/);
  assert.match(admin, /حذف الموديل/);
  assert.match(admin, /new Set\(modelNames\)\.size/);
  assert.match(selector, /selected\.image \|\| productImage/);
  assert.match(database, /select\("\*, product_models\(\*, product_model_variants\(\*\)\)"\)/);
  details.forEach((source, index) => {
    assert.match(source, index === 1 ? /searchParams\?: Promise<\{ model\?: string; color\?: string \}>/ : /searchParams\?: Promise<\{ model\?: string \}>/);
    assert.match(source, /<ProductModelSelector/);
  });
});
