import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  PRINTER_SPECIFICATION_TARGETS,
  buildPatch,
  buildPlan,
  matchesModel,
  verifyPatch,
} from "../scripts/update-printer-specifications.mjs";
import {
  assertArabicIntegrity,
  assertPrinterPageContent,
  inspectArabicIntegrity,
} from "../scripts/arabic-content-integrity.mjs";

test("contains exactly ten unique target models", () => {
  assert.equal(PRINTER_SPECIFICATION_TARGETS.length, 10);
  assert.equal(new Set(PRINTER_SPECIFICATION_TARGETS.map(({ model }) => model)).size, 10);
});

test("matches formatting variations without confusing adjacent models", () => {
  assert.equal(matchesModel("EcoTank -L6290", "L6290"), true);
  assert.equal(matchesModel("Epson EcoTank-L6290", "L6290"), true);
  assert.equal(matchesModel("EcoTank L5298", "L5290"), false);
});

test("treats every matching record as ready while still classifying missing products", () => {
  const rows = [
    { id: 1, name: "EcoTank -L15180" },
    { id: 2, name: "EcoTank- L4360" },
    { id: 3, name: "EcoTank-L4360" },
  ];
  const byModel = new Map(buildPlan(rows).map((item) => [item.desired.model, item.status]));
  assert.equal(byModel.get("L15180"), "READY");
  assert.equal(byModel.get("L4360"), "READY");
  assert.equal(byModel.get("L6290"), "NOT FOUND");
  assert.equal(buildPlan(rows).find((item) => item.desired.model === "L4360").matches.length, 2);
});

test("builds a page-content-only patch without replacing other product fields", () => {
  const target = PRINTER_SPECIFICATION_TARGETS.find(({ model }) => model === "WF-C529R");
  const row = {
    specifications: { nfc: true, standardPaperCapacity: 330 },
    printer_page_content: { faq: [{ question: "سؤال حالي", answer: "إجابة حالية" }], legacy: "keep" },
  };
  const patch = buildPatch(row, target);
  assert.deepEqual(Object.keys(patch), ["printer_page_content"]);
  assert.equal(Object.hasOwn(patch, "description"), false);
  assert.equal(Object.hasOwn(patch, "specifications"), false);
  assert.equal(Object.hasOwn(patch, "features"), false);
  assert.equal(Object.hasOwn(patch, "badge"), false);
  assert.equal(patch.printer_page_content.faq.length, 6);
  assert.equal(patch.printer_page_content.legacy, "keep");
  assert.equal(verifyPatch({ ...row, ...patch }, patch), true);
});

test("rejects corrupted Arabic and accepts a real Arabic fixture", () => {
  const cleanFixture = { title: "طباعة لاسلكية", description: "تدعم الطباعة عبر Wi-Fi؟" };
  assert.doesNotThrow(() => assertArabicIntegrity(cleanFixture, "fixture.clean"));
  assert.equal(inspectArabicIntegrity(cleanFixture).suspiciousQuestionMarkSequences, 0);
  assert.throws(
    () => assertArabicIntegrity({ title: "???? ??????", description: "Wi-Fi ???????" }, "fixture.corrupted"),
    /suspicious question marks detected/,
  );
  assert.throws(
    () => assertArabicIntegrity({ title: "Wi-Fi", description: "USB" }, "fixture.missing-arabic"),
    /no Arabic characters detected/,
  );
  for (const target of PRINTER_SPECIFICATION_TARGETS) {
    assert.doesNotThrow(() => assertPrinterPageContent(target.pageContent, `fixture.${target.model}`));
  }
});

test("every target has reference-depth Arabic page content", () => {
  for (const target of PRINTER_SPECIFICATION_TARGETS) {
    const content = target.pageContent;
    assert.ok(content.detailedDescription.split("\n\n").length >= 3, `${target.model}: detailed description`);
    assert.ok(content.productFeatures.length >= 5 && content.productFeatures.length <= 7, `${target.model}: features`);
    assert.ok(content.productUses.length >= 4 && content.productUses.length <= 6, `${target.model}: uses`);
    assert.ok(content.whyChooseThisProduct.split("\n\n").length >= 2, `${target.model}: why choose`);
    assert.ok(content.faq.length >= 5 && content.faq.length <= 7, `${target.model}: FAQ`);
    assert.ok(content.productFeatures.every((item) => item.title && item.description), `${target.model}: feature descriptions`);
    assert.ok(content.productUses.every((item) => item.title && item.description), `${target.model}: use descriptions`);
    assert.ok(content.faq.every((item) => item.question && item.answer), `${target.model}: FAQ answers`);
  }
});

test("maps nulls, duplex modes, speed units and current usage options", () => {
  const l3266 = PRINTER_SPECIFICATION_TARGETS.find(({ model }) => model === "L3266").specifications;
  const workforce = PRINTER_SPECIFICATION_TARGETS.find(({ model }) => model === "WF-M5799DWF").specifications;
  assert.equal(l3266.adfCapacity, null);
  assert.equal(l3266.duplex, false);
  assert.equal(l3266.duplexMode, "manual");
  assert.equal(l3266.speedUnit, "صورة/دقيقة");
  assert.equal(l3266.usage.includes("مكتبي شخصي"), true);
  assert.equal(workforce.photoPrintTimeSeconds, null);
  assert.equal(workforce.speedUnit, "صفحة/دقيقة");
  assert.equal(workforce.colorMode, "أحادي اللون");
});

test("content migration updates only descriptions and page content without creating or deleting products", async () => {
  const migration = await readFile(new URL("../supabase/migrations/20260826230000_standardize_printer_detail_content.sql", import.meta.url), "utf8");
  assert.match(migration, /update products\s+set\s+description = desired\.description,\s+printer_page_content =/i);
  assert.doesNotMatch(migration, /insert\s+into\s+products/i);
  assert.doesNotMatch(migration, /delete\s+from\s+products/i);
  assert.doesNotMatch(migration, /\bspecifications\s*=/i);
  for (const target of PRINTER_SPECIFICATION_TARGETS) assert.match(migration, new RegExp(`'${target.model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'`));
});
