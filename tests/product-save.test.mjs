import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  addProductToCollection,
  removeProductById,
  replaceProductById,
} from "../app/product-collection.ts";

const semanticHash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

test("replacing one product preserves the collection and every other product", () => {
  const products = Array.from({ length: 33 }, (_, index) => ({
    id: index + 1,
    name: `Product ${index + 1}`,
    family: "",
    image: "/brand/eshak-logo.png",
    category: index < 25 ? "printers" : "papers",
    type: "",
    size: "",
    description: "",
    features: [],
  }));
  const target = products[12];
  const updated = {
    ...target,
    printerPageContent: {
      detailedDescription: "وصف محفوظ",
      productFeatures: [{ title: "ميزة", description: "شرح" }],
      productUses: [],
      whyChooseThisProduct: "",
      faq: [],
    },
  };
  const beforeOtherProductsHash = semanticHash(products.filter((product) => product.id !== target.id));
  const result = replaceProductById(products, updated);

  assert.equal(result.length, 33);
  assert.equal(result.filter((product) => product.category === "printers").length, 25);
  assert.deepEqual(result.find((product) => product.id === target.id)?.printerPageContent, updated.printerPageContent);
  assert.equal(
    semanticHash(result.filter((product) => product.id !== target.id)),
    beforeOtherProductsHash,
  );
  assert.equal(result.every((product, index) => product.id === target.id || product === products[index]), true);
});

test("the single-product save path updates only the matching id and preserves nullable page content", async () => {
  const [database, route, admin] = await Promise.all([
    readFile(new URL("../lib/site-database.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/site/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-dashboard.tsx", import.meta.url), "utf8"),
  ]);
  const updateProductSource = database.match(/export async function updateProduct[\s\S]+?\n}\n/)?.[0] ?? "";

  assert.match(updateProductSource, /\.from\("products"\)/);
  assert.match(updateProductSource, /\.update\(/);
  assert.match(updateProductSource, /\.eq\("id", product\.id\)/);
  assert.doesNotMatch(updateProductSource, /\.delete\(/);
  assert.doesNotMatch(updateProductSource, /replaceSiteData/);
  assert.match(database, /printer_page_content:[\s\S]+?\? product\.printerPageContent[\s\S]+?: null/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /const savedProduct = await updateProduct\(product\)/);
  assert.match(admin, /method: editingId \? "PATCH" : "POST"/);
  assert.match(admin, /replaceProductById\(products, data\.product/);
});

test("adding and deleting one product preserves every original product", () => {
  const products = Array.from({ length: 33 }, (_, index) => ({
    id: index + 1,
    name: `Product ${index + 1}`,
    family: "",
    image: "/brand/eshak-logo.png",
    category: index < 25 ? "printers" : "papers",
    type: "",
    size: "",
    description: "",
    features: [],
    printerPageContent: index === 12 ? {
      detailedDescription: "محتوى أصلي",
      productFeatures: [],
      productUses: [],
      whyChooseThisProduct: "",
      faq: [],
    } : undefined,
  }));
  const originalsHash = semanticHash(products);
  const trial = { ...products[32], id: 999, name: "منتج تجريبي CRUD" };
  const afterInsert = addProductToCollection(products, trial);

  assert.equal(afterInsert.length, 34);
  assert.equal(semanticHash(afterInsert.filter((product) => product.id !== trial.id)), originalsHash);
  assert.deepEqual(afterInsert.find((product) => product.id === 13)?.printerPageContent, products[12].printerPageContent);

  const afterDelete = removeProductById(afterInsert, trial.id);
  assert.equal(afterDelete.length, 33);
  assert.equal(semanticHash(afterDelete), originalsHash);
});

test("daily product CRUD uses row-scoped insert, update and delete without replace_site_data", async () => {
  const [database, route, admin] = await Promise.all([
    readFile(new URL("../lib/site-database.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/site/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-dashboard.tsx", import.meta.url), "utf8"),
  ]);
  const createSource = database.match(/export async function createProduct[\s\S]+?\n}\n/)?.[0] ?? "";
  const deleteSource = database.match(/export async function removeProduct[\s\S]+?\n}\n/)?.[0] ?? "";

  assert.match(createSource, /\.insert\(productToRow\(/);
  assert.doesNotMatch(createSource, /replaceSiteData|\.update\(|\.delete\(/);
  assert.match(deleteSource, /\.delete\(\)/);
  assert.match(deleteSource, /\.eq\("id", id\)/);
  assert.doesNotMatch(deleteSource, /replaceSiteData|\.insert\(|\.update\(/);
  assert.doesNotMatch(route, /replaceSiteData|replace_site_data/);
  assert.match(route, /export async function POST/);
  assert.match(route, /export async function DELETE/);
  assert.match(route, /const savedProduct = await createProduct\(product\)/);
  assert.match(route, /const deletedProduct = await removeProduct\(id\)/);
  assert.match(admin, /method: editingId \? "PATCH" : "POST"/);
  assert.match(admin, /method: "DELETE"/);
  assert.match(admin, /body: JSON\.stringify\(\{ settings \}\)/);
  assert.doesNotMatch(admin, /product-list/);
});
