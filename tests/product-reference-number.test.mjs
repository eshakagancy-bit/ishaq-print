import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PRODUCT_REFERENCE_DUPLICATE_MESSAGE,
  PRODUCT_REFERENCE_MAX_LENGTH,
  hasDuplicateProductReference,
  normalizeProductReferenceNumber,
  productReferenceKey,
} from "../app/product-reference.ts";
import { searchProducts } from "../app/global-product-search.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("printer, ink, and paper references are manual text values that only trim outer spaces", () => {
  for (const category of ["printers", "inks", "papers"]) {
    const product = { id: category.length, category, referenceNumber: normalizeProductReferenceNumber("  Sqm-1001  ") };
    assert.equal(product.referenceNumber, "Sqm-1001");
  }
  assert.equal(normalizeProductReferenceNumber("   "), undefined);
  assert.equal(PRODUCT_REFERENCE_MAX_LENGTH, 50);
  assert.equal(productReferenceKey(" PR-001 "), "pr-001");
});

test("global case-insensitive uniqueness rejects another product but permits the same product on edit", () => {
  const products = [
    { id: 1, referenceNumber: "REF-100" },
    { id: 2, referenceNumber: "INK-025" },
  ];
  assert.equal(hasDuplicateProductReference(products, "ref-100"), true);
  assert.equal(hasDuplicateProductReference(products, " REF-100 ", 1), false);
  assert.equal(hasDuplicateProductReference(products, "ink-025", 1), true);
  assert.equal(hasDuplicateProductReference(products, "", 3), false);
  assert.equal(PRODUCT_REFERENCE_DUPLICATE_MESSAGE, "الرقم المرجعي مستخدم بالفعل لمنتج آخر. اختر رقمًا مختلفًا.");
});

test("partial product search finds references in all and category-specific scopes", () => {
  const products = [
    { id: 1, category: "printers", referenceNumber: "PR-001" },
    { id: 2, category: "inks", referenceNumber: "INK-025" },
    { id: 3, category: "papers", referenceNumber: "PAP-010" },
  ];
  const values = (product) => [product.referenceNumber];
  assert.deepEqual(searchProducts(products, "pr-00", "all", values).map((product) => product.id), [1]);
  assert.deepEqual(searchProducts(products, "ink-025", "inks", values).map((product) => product.id), [2]);
  assert.deepEqual(searchProducts(products, "pap-01", "papers", values).map((product) => product.id), [3]);
  assert.deepEqual(searchProducts(products, "PR-001", "inks", values), []);
});

test("database mapping, migration, API validation, and conflict handling enforce the reference contract", async () => {
  const [database, migration, setup, validation, route] = await Promise.all([
    read("lib/site-database.ts"),
    read("supabase/migrations/20260822090000_add_product_reference_number.sql"),
    read("supabase/setup.sql"),
    read("app/api/site/validation.ts"),
    read("app/api/site/route.ts"),
  ]);
  assert.match(database, /reference_number: normalizeProductReferenceNumber\(product\.referenceNumber\) \?\? null/);
  assert.match(database, /referenceNumber: normalizeProductReferenceNumber\(row\.reference_number\)/);
  assert.match(database, /ensureProductReferenceAvailable\(client, product\.referenceNumber, product\.id\)/);
  assert.match(database, /ensureProductReferenceAvailable\(client, product\.referenceNumber\)/);
  assert.match(migration, /add column if not exists reference_number text/);
  assert.match(migration, /create unique index if not exists products_reference_number_ci_uidx[\s\S]*?lower\(reference_number\)/);
  assert.match(migration, /where reference_number is not null/);
  assert.match(migration, /having count\(\*\) > 1/);
  assert.match(setup, /reference_number text/);
  assert.match(validation, /"referenceNumber"/);
  assert.match(validation, /PRODUCT_REFERENCE_MAX_LENGTH/);
  assert.match(route, /status: 409/);
  assert.match(route, /PRODUCT_REFERENCE_DUPLICATE_MESSAGE/);
});

test("admin supports add, edit, duplicate UX, and list visibility for every product category", async () => {
  const admin = await read("app/admin/admin-dashboard.tsx");
  assert.match(admin, /الرقم المرجعي<input/);
  assert.match(admin, /placeholder="مثال: PR-001"/);
  assert.match(admin, /maxLength=\{PRODUCT_REFERENCE_MAX_LENGTH\}/);
  assert.match(admin, /normalizeProductReferenceNumber\(productForm\.referenceNumber\)/);
  assert.match(admin, /hasDuplicateProductReference\(products, referenceNumber, editingId \?\? undefined\)/);
  assert.match(admin, /PRODUCT_REFERENCE_DUPLICATE_MESSAGE/);
  assert.match(admin, /referenceNumber,\s*image:/);
  assert.match(admin, /admin-product-reference/);
  assert.doesNotMatch(admin, /referenceNumber:\s*(?:Date\.now|crypto|randomUUID)/i);
});

test("details hide empty references, show populated references, and quick view receives the same value", async () => {
  const [display, printer, ink, paper, quickView, home, categories] = await Promise.all([
    read("app/product-reference-display.tsx"),
    read("app/printers/[slug]/page.tsx"),
    read("app/inks/[slug]/page.tsx"),
    read("app/papers/[slug]/page.tsx"),
    read("app/quick-view-modal.tsx"),
    read("app/home-client.tsx"),
    read("app/category-products-client.tsx"),
  ]);
  assert.match(display, /if \(!referenceNumber\) return null/);
  assert.match(display, /<dt>الرقم المرجعي<\/dt>/);
  for (const details of [printer, ink, paper]) {
    assert.match(details, /<ProductReferenceDisplay value=\{product\.referenceNumber\} \/>/);
    assert.match(details, /referenceNumber=\{product\.referenceNumber\}/);
  }
  assert.match(quickView, /<ProductReferenceDisplay value=\{referenceNumber\} compact \/>/);
  assert.match(home, /referenceNumber=\{selected\.referenceNumber\}/);
  assert.match(categories, /referenceNumber=\{selected\.referenceNumber\}/);
});

test("global search indexes reference numbers without changing its UI", async () => {
  const [drawer, home] = await Promise.all([read("app/global-search-drawer.tsx"), read("app/home-client.tsx")]);
  assert.match(drawer, /product\.referenceNumber/);
  assert.match(home, /product\.referenceNumber/);
  assert.match(drawer, /placeholder="ابحث عن منتج\.\.\."/);
});
