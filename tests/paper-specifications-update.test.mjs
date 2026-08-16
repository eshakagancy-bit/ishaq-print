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
  mergePaperSpecificationsUpdate,
} from "../lib/paper-specifications-update.ts";

const rowsFromTargets = (specifications = null) => PAPER_SPECIFICATIONS_UPDATE_TARGETS.map((target, index) => ({
  id: index + 1,
  name: target.name,
  specifications: specifications === "current"
    ? mergePaperSpecificationsUpdate(null, target.patch)
    : specifications,
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

  const uncertainTarget = PAPER_SPECIFICATIONS_UPDATE_TARGETS.find((target) =>
    target.name === "QM ROCK5 Double Side Matte Paper 120gsm");
  const preserved = mergePaperSpecificationsUpdate(
    { size: "A3", sheetCount: 77, printerCompatibility: ["Inkjet"], uses: ["صور"] },
    uncertainTarget.patch,
  );
  assert.equal(preserved.size, "A3");
  assert.equal(preserved.sheetCount, 77);
  assert.deepEqual(preserved.printerCompatibility, ["Inkjet"]);
  assert.deepEqual(preserved.uses, ["صور"]);

  for (const target of PAPER_SPECIFICATIONS_UPDATE_TARGETS.slice(3)) {
    if (target.name.startsWith("SQM ")) continue;
    assert.equal(Object.hasOwn(target.patch, "size"), false);
    assert.equal(Object.hasOwn(target.patch, "sheetCount"), false);
  }
  const premiumRc = PAPER_SPECIFICATIONS_UPDATE_TARGETS.find((target) =>
    target.name === "QM Premium RC Glossy Photo Paper 260gsm");
  assert.equal(Object.hasOwn(premiumRc.patch, "size"), false);
  assert.equal(Object.hasOwn(premiumRc.patch, "sheetCount"), false);
});

test("all eight target specifications render non-empty cards and details", () => {
  for (const target of PAPER_SPECIFICATIONS_UPDATE_TARGETS) {
    const specifications = mergePaperSpecificationsUpdate(null, target.patch);
    assert.ok(getPaperCardSpecificationTags({ paperSpecifications: specifications }).length > 0);
    assert.ok(buildPaperSpecificationRows({ paperSpecifications: specifications }).length > 0);
  }
});

test("temporary admin route stays authenticated and database writes specifications only while its admin tool stays hidden", async () => {
  const [route, database, admin, home, paperSpecifications] = await Promise.all([
    readFile(new URL("../app/api/admin/paper-specifications-update/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/site-database.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/admin-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/paper-specifications.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /requireAdminApi\(\)/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(database, /\.update\(\{ specifications: desiredSpecifications \}\)/);
  assert.match(database, /\.eq\("name", target\.name\)/);
  assert.match(database, /\.eq\("category", "papers"\)/);
  assert.match(database, /pendingCount !== 0/);
  assert.doesNotMatch(admin, /تحديث مواصفات الأوراق الحالية/);
  assert.doesNotMatch(admin, /paper-update-tool|paperUpdatePreview|previewPaperSpecificationsUpdate/);
  assert.match(home, /product\.paperSpecifications\?\.nameEn\?\.trim\(\) \|\| product\.name/);
  assert.doesNotMatch(home, /product\.paperSpecifications\?\.nameAr\?\.trim\(\) \|\| product\.name/);
  assert.match(paperSpecifications, /key: "name-ar", label: "الاسم العربي"/);

  const updateCall = database.match(/\.update\(\{ specifications: desiredSpecifications \}\)[\s\S]+?\.maybeSingle\(\)/)?.[0] ?? "";
  for (const protectedField of ["name:", "image:", "price:", "sortOrder:", "category:"]) {
    assert.equal(updateCall.includes(protectedField), false);
  }
});
