import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildPaperSpecificationRows,
  getPaperCardSpecificationTags,
} from "../app/paper-specifications.ts";
import {
  PAPER_SPECIFICATIONS_UPDATE_TARGETS,
  buildPaperSpecificationsUpdatePreview,
} from "../lib/paper-specifications-update.ts";

const rowsFromTargets = (specifications = null) => PAPER_SPECIFICATIONS_UPDATE_TARGETS.map((target, index) => ({
  id: index + 1,
  name: target.name,
  specifications: specifications === "current" ? target.specifications : specifications,
}));

test("paper admin update targets exactly eight existing names and previews before execution", () => {
  assert.equal(PAPER_SPECIFICATIONS_UPDATE_TARGETS.length, 8);
  assert.equal(new Set(PAPER_SPECIFICATIONS_UPDATE_TARGETS.map((target) => target.name)).size, 8);

  const preview = buildPaperSpecificationsUpdatePreview(rowsFromTargets());
  assert.equal(preview.ready, true);
  assert.equal(preview.matchedCount, 8);
  assert.equal(preview.expectedCount, 8);
  assert.equal(preview.pendingCount, 8);
  assert.equal(preview.products.every((product) => product.found && product.changes.length > 0), true);
});

test("paper admin update refuses missing or duplicate matches", () => {
  assert.equal(buildPaperSpecificationsUpdatePreview(rowsFromTargets().slice(0, 7)).ready, false);
  assert.equal(buildPaperSpecificationsUpdatePreview([...rowsFromTargets(), rowsFromTargets()[0]]).ready, false);
});

test("paper admin update is idempotent and preserves unknown values", () => {
  const preview = buildPaperSpecificationsUpdatePreview(rowsFromTargets("current"));
  assert.equal(preview.ready, true);
  assert.equal(preview.pendingCount, 0);
  assert.equal(preview.products.every((product) => product.alreadyCurrent), true);

  const byWeight = Object.fromEntries(PAPER_SPECIFICATIONS_UPDATE_TARGETS.map((target) => [
    target.specifications.weightGsm,
    target.specifications,
  ]));
  for (const weight of [120, 180, 108]) {
    assert.equal(byWeight[weight].size, null);
    assert.equal(byWeight[weight].sheetCount, null);
  }
  const premiumRc = PAPER_SPECIFICATIONS_UPDATE_TARGETS.find((target) =>
    target.name === "QM Premium RC Glossy Photo Paper 260gsm");
  assert.equal(premiumRc.specifications.size, null);
  assert.equal(premiumRc.specifications.sheetCount, null);
});

test("all eight target specifications render non-empty cards and details", () => {
  for (const target of PAPER_SPECIFICATIONS_UPDATE_TARGETS) {
    assert.ok(getPaperCardSpecificationTags({ paperSpecifications: target.specifications }).length > 0);
    assert.ok(buildPaperSpecificationRows({ paperSpecifications: target.specifications }).length > 0);
  }
});

test("temporary admin route stays authenticated and database writes specifications only", async () => {
  const [route, database, admin] = await Promise.all([
    readFile(new URL("../app/api/admin/paper-specifications-update/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/site-database.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-dashboard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /requireAdminApi\(\)/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(database, /\.update\(\{ specifications: target\.specifications \}\)/);
  assert.match(database, /\.eq\("name", target\.name\)/);
  assert.match(database, /\.eq\("category", "papers"\)/);
  assert.match(database, /pendingCount !== 0/);
  assert.match(admin, /تحديث مواصفات الأوراق الحالية/);
  assert.match(admin, /عرض المعاينة/);

  const updateCall = database.match(/\.update\(\{ specifications: target\.specifications \}\)[\s\S]+?\.maybeSingle\(\)/)?.[0] ?? "";
  for (const protectedField of ["name:", "image:", "price:", "sortOrder:", "category:"]) {
    assert.equal(updateCall.includes(protectedField), false);
  }
});
