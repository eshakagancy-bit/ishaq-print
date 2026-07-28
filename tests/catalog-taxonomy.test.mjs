import assert from "node:assert/strict";
import test from "node:test";
import {
  CATALOG_TAXONOMY,
  getAncestors,
  getChildren,
  getTaxonomyNodeByPath,
  matchProductsForNode,
} from "../app/catalog-taxonomy.ts";

function products(count, printerCategory, family) {
  return Array.from({ length: count }, () => ({
    category: "printers",
    printerCategory,
    family,
  }));
}

const currentPrinterFixture = [
  ...products(7, "workforce", "Epson WorkForce Pro"),
  ...products(4, "workforce", "Epson WorkForce Enterprise"),
  ...products(1, "workforce", "Epson WorkForce"),
  ...products(7, "ecotank", "Epson EcoTank"),
  ...products(3, "ecotank-6-color", "Epson EcoTank Photo"),
  ...products(2, "lq", "Epson LQ"),
  ...products(1, "lq", "Epson FX"),
];

test("matches the current printer hierarchy without forcing the general WorkForce product into a child", () => {
  const workforce = matchProductsForNode("workforce", currentPrinterFixture);
  const workforcePro = matchProductsForNode("workforce-pro", currentPrinterFixture);
  const workforceEnterprise = matchProductsForNode("workforce-enterprise", currentPrinterFixture);

  assert.equal(workforce.length, 12);
  assert.equal(workforcePro.length, 7);
  assert.equal(workforceEnterprise.length, 4);
  assert.equal(workforce.filter((product) =>
    !workforcePro.includes(product) && !workforceEnterprise.includes(product)
  ).length, 1);
  assert.equal(matchProductsForNode("ecotank-standard", currentPrinterFixture).length, 7);
  assert.equal(matchProductsForNode("ecotank-six-color", currentPrinterFixture).length, 3);
  assert.equal(matchProductsForNode("lq", currentPrinterFixture).length, 3);
});

test("resolves paths, children and ancestors in hierarchy order", () => {
  const pro = getTaxonomyNodeByPath("/categories/printers/workforce/pro");
  assert.equal(pro?.id, "workforce-pro");
  assert.equal(getTaxonomyNodeByPath(["printers", "ecotank", "six-color"])?.id, "ecotank-six-color");
  assert.equal(getTaxonomyNodeByPath("/categories/printers/workforce/enterprise")?.id, "workforce-enterprise");
  assert.equal(getTaxonomyNodeByPath("/categories/printers/unknown"), undefined);

  assert.deepEqual(getChildren("printers").map((node) => node.id), ["workforce", "ecotank", "lq"]);
  assert.deepEqual(getChildren("workforce").map((node) => node.id), ["workforce-pro", "workforce-enterprise"]);
  assert.deepEqual(getAncestors("workforce-pro").map((node) => node.id), ["printers", "workforce"]);
  assert.deepEqual(getAncestors("printers"), []);
  assert.equal(getChildren(null).length, 11);
});

test("defines unique ids and sibling slugs", () => {
  assert.equal(new Set(CATALOG_TAXONOMY.map((node) => node.id)).size, CATALOG_TAXONOMY.length);
  for (const node of CATALOG_TAXONOMY) {
    assert.equal(
      CATALOG_TAXONOMY.filter((candidate) =>
        candidate.parentId === node.parentId && candidate.slug === node.slug
      ).length,
      1,
    );
  }
});
