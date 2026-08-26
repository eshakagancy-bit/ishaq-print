import assert from "node:assert/strict";
import test from "node:test";
import {
  PRINTER_SPECIFICATION_TARGETS,
  buildPatch,
  buildPlan,
  matchesModel,
  verifyPatch,
} from "../scripts/update-printer-specifications.mjs";

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

test("merges only requested fields and preserves FAQ and unrelated specification fields", () => {
  const target = PRINTER_SPECIFICATION_TARGETS.find(({ model }) => model === "WF-C529R");
  const row = {
    specifications: { nfc: true, standardPaperCapacity: 330 },
    printer_page_content: { faq: [{ question: "سؤال حالي", answer: "إجابة حالية" }], legacy: "keep" },
  };
  const patch = buildPatch(row, target);
  assert.equal(patch.specifications.nfc, true);
  assert.equal(patch.specifications.standardPaperCapacity, 330);
  assert.deepEqual(patch.printer_page_content.faq, row.printer_page_content.faq);
  assert.equal(patch.printer_page_content.legacy, "keep");
  assert.deepEqual(patch.specifications.functions, ["طباعة"]);
  assert.equal(patch.specifications.scanner, false);
  assert.equal(patch.specifications.fax, false);
  assert.equal(patch.specifications.adfCapacity, null);
  assert.equal(verifyPatch({ ...row, ...patch }, patch), true);
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
