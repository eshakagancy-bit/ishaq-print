import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  normalizeProductSearchText,
  productSearchMatchHref,
  searchProductResults,
  searchProducts,
} from "../app/global-product-search.ts";

const variant = (id, color, partNumber, isActive = true) => ({
  id, color, partNumber, isActive, availability: "in_stock", sortOrder: id,
});
const model = (id, name, partNumber, compatibility, variants = [], isActive = true) => ({
  id, model: name, partNumber, compatibility, variants, isActive, availability: "in_stock", sortOrder: id,
});

const blackProduct = {
  id: 1, category: "laser_inks", name: "HP حبر ليزر أسود", brand: "HP",
  models: [
    model(1, "HP 78A", "CE278A", "HP LaserJet Pro P1566/P1606; HP LaserJet Pro MFP M1536"),
    model(2, "HP 05A", "CE505A", "HP LaserJet P2035/P2055"),
    model(3, "HP 76A", "CF276A", "HP LaserJet Pro M304/M404"),
    model(4, "HP 59A", "CF259A", "HP LaserJet Pro M304/M404"),
  ],
};

const colorProduct = {
  id: 2, category: "laser_inks", name: "HP حبر ليزر ملون", brand: "HP",
  models: [
    model(10, "HP 410A", undefined, "HP Color LaserJet Pro M452; HP Color LaserJet Pro MFP M377/M477", [
      variant(101, "black", "CF410A"), variant(102, "cyan", "CF411A"),
      variant(103, "magenta", "CF413A"), variant(104, "yellow", "CF412A"),
    ]),
    model(11, "HP 415A - مع الشريحة", undefined, "HP Color LaserJet Pro M454; HP Color LaserJet Pro MFP M479", [
      variant(111, "black", "W2030A"), variant(112, "magenta", "W2033A"), variant(113, "yellow", "W2032A"),
    ]),
    model(12, "HP 207A - مع الشريحة", undefined, "HP Color LaserJet Pro M255; HP Color LaserJet Pro MFP M282/M283", [
      variant(121, "black", "W2210A"), variant(122, "cyan", "W2211A"),
    ]),
    model(13, "HP 826A", undefined, "HP Color LaserJet Enterprise M855", [variant(131, "black", "CF310A")]),
    model(14, "HP 307A", undefined, "HP Color LaserJet Professional CP5225", [variant(141, "black", "CE740A")]),
    model(16, "HP 205A", undefined, "HP Color LaserJet Pro M180", [variant(151, "black", "CF530A")]),
    model(15, "HP hidden", "HIDDEN", "M999", [], false),
  ],
};

const products = [blackProduct, colorProduct];
const values = (product) => [product.name, product.brand];

test("laser search normalizes case, spacing and separators", () => {
  assert.equal(normalizeProductSearchText(" HP-410A "), "hp 410a");
  for (const query of ["HP410A", "HP 410A", "410A", "hp 410a"]) {
    const result = searchProductResults(products, query, "inks", values);
    assert.equal(result.length, 1);
    assert.equal(result[0].product.id, colorProduct.id);
    assert.deepEqual(result[0].matchedModels.map((match) => match.model.model), ["HP 410A"]);
    assert.deepEqual(result[0].matchedModels[0].variants, []);
  }
});

test("laser products remain searchable by product name and partial model name", () => {
  const productNameResults = searchProductResults(products, colorProduct.name, "inks", values);
  assert.equal(productNameResults.length, 1);
  assert.equal(productNameResults[0].product.id, colorProduct.id);

  const partialModelResults = searchProductResults(products, "410", "inks", values);
  assert.equal(partialModelResults.length, 1);
  assert.equal(partialModelResults[0].product.id, colorProduct.id);
  assert.deepEqual(partialModelResults[0].matchedModels.map((match) => match.model.model), ["HP 410A"]);
});

test("variant part number exposes its model, color, part number and deep link", () => {
  const [result] = searchProductResults(products, "cf411a", "inks", values);
  assert.equal(result.product.id, colorProduct.id);
  assert.equal(result.matchedModels.length, 1);
  assert.equal(result.matchedModels[0].model.model, "HP 410A");
  assert.deepEqual(result.matchedModels[0].variants.map(({ color, partNumber }) => [color, partNumber]), [["cyan", "CF411A"]]);
  assert.equal(
    productSearchMatchHref("/inks/2-hp", result.matchedModels[0].model, result.matchedModels[0].variants[0]),
    "/inks/2-hp?model=HP+410A&color=cyan",
  );
});

test("black model part numbers and compatible printer names resolve the correct model", () => {
  for (const [query, expectedModel] of [["78A", "HP 78A"], ["CE278A", "HP 78A"], ["P1566", "HP 78A"], ["M1536", "HP 78A"], ["05A", "HP 05A"], ["CE505A", "HP 05A"], ["P2055", "HP 05A"]]) {
    const result = searchProductResults(products, query, "inks", values);
    assert.equal(result.length, 1, query);
    assert.equal(result[0].product.id, blackProduct.id, query);
    assert.deepEqual(result[0].matchedModels.map((match) => match.model.model), [expectedModel], query);
  }
});

test("short toner model codes do not collide with longer model codes", () => {
  const results = searchProductResults(products, "05A", "inks", values);
  assert.equal(results.length, 1);
  assert.equal(results[0].product.id, blackProduct.id);
  assert.deepEqual(results[0].matchedModels.map((match) => match.model.model), ["HP 05A"]);
});

test("compatibility supports partial and full printer queries", () => {
  for (const query of ["M452", "m477", "HP Color LaserJet Pro M452", "M454", "M479", "M255", "M283", "M855", "CP5225"]) {
    const [result] = searchProductResults(products, query, "inks", values);
    assert.equal(result.product.id, colorProduct.id, query);
    assert.equal(result.matchedModels.length, 1, query);
    assert.ok(result.matchedModels[0].kinds.includes("compatibility"), query);
  }
});

test("multiple compatible models are grouped under one deduplicated product", () => {
  const results = searchProductResults(products, "M404", "all", values);
  assert.equal(results.length, 1);
  assert.equal(results[0].product.id, blackProduct.id);
  assert.deepEqual(results[0].matchedModels.map((match) => match.model.model), ["HP 76A", "HP 59A"]);
});

test("all requested colored model and part-number samples return one product", () => {
  for (const query of ["410A", "CF410A", "CF411A", "415A", "W2210A", "826A", "CF310A", "307A", "CE740A"]) {
    const results = searchProductResults(products, query, "inks", values);
    assert.equal(results.length, 1, query);
    assert.equal(results[0].product.id, colorProduct.id, query);
  }
});

test("exact model ranks ahead of product-level and partial matches", () => {
  const competing = { id: 3, category: "inks", name: "410A compatible supplies", brand: "Other", models: [] };
  const results = searchProductResults([competing, colorProduct], "410A", "all", values);
  assert.deepEqual(results.map((result) => result.product.id), [colorProduct.id, competing.id]);
  assert.deepEqual(results.map((result) => result.rank), [0, 3]);
});

test("inactive models are excluded and legacy category searches remain scoped", () => {
  assert.equal(searchProductResults(products, "M999", "inks", values).length, 0);
  const regressions = [
    { id: 20, category: "printers", name: "Epson L15150" },
    { id: 21, category: "papers", name: "Double A A4" },
    { id: 22, category: "inks", name: "Epson 003 Ink" },
  ];
  assert.equal(searchProducts(regressions, "Epson", "printers", (product) => [product.name]).length, 1);
  assert.equal(searchProducts(regressions, "Double A", "papers", (product) => [product.name]).length, 1);
  assert.equal(searchProducts(regressions, "003", "inks", (product) => [product.name]).length, 1);
});

test("laser result context uses semantic deep links and visible non-color-only metadata", async () => {
  const source = await readFile(new URL("../app/search-result-model-matches.tsx", import.meta.url), "utf8");
  assert.match(source, /role="group" aria-label="الموديلات المطابقة"/);
  assert.match(source, /productSearchMatchHref\(productHref, match\.model, variant\)/);
  assert.match(source, /laserInkColorLabel\(variant\.color\)/);
  assert.match(source, /variant\.partNumber/);
  assert.match(source, /متوافق مع بحثك/);
  assert.match(source, /className="search-result-model-chip"/);
});
