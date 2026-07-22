import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQuickViewSpecificationRows,
  createEmptyPrinterSpecifications,
  formValueToTriState,
  getProductCardSpecificationTags,
  normalizePrinterSpecifications,
  triStateToFormValue,
} from "../app/printer-specifications.ts";

test("normalizes structured specifications for save and edit without inventing defaults", () => {
  const specifications = normalizePrinterSpecifications({
    paperSize: "A3+",
    printerType: "طابعة صور",
    functions: ["طباعة", "طباعة", "مسح ضوئي", "غير معتمد"],
    wifi: true,
    ethernet: false,
    usb: null,
    colorCount: "6",
    printSpeed: "18.5",
    usage: ["تصوير فوتوجرافي"],
  });

  assert.deepEqual(specifications, {
    ...createEmptyPrinterSpecifications(),
    paperSize: "A3+",
    printerType: "طابعة صور",
    functions: ["طباعة", "مسح ضوئي"],
    wifi: true,
    ethernet: false,
    colorCount: 6,
    printSpeed: 18.5,
    usage: ["تصوير فوتوجرافي"],
  });
  assert.equal(normalizePrinterSpecifications(undefined), undefined);
});

test("preserves yes, no and unknown as three distinct states", () => {
  assert.equal(formValueToTriState("yes"), true);
  assert.equal(formValueToTriState("no"), false);
  assert.equal(formValueToTriState("unknown"), null);
  assert.equal(triStateToFormValue(true), "yes");
  assert.equal(triStateToFormValue(false), "no");
  assert.equal(triStateToFormValue(null), "unknown");
});

test("shows dot-matrix fields and characters per second while hiding inkjet-only fields", () => {
  const rows = buildQuickViewSpecificationRows({
    printerCategory: "lq",
    specifications: {
      ...createEmptyPrinterSpecifications(),
      printerType: "طابعة نقطية",
      printSpeed: 738,
      speedUnit: "حرف/ثانية",
      colorCount: 4,
      scanner: false,
      adf: false,
      inkType: "شريط طباعة",
      dotMatrixPins: 24,
      printColumns: 106,
      multipartCopies: 7,
      ribbonYield: 10000000,
    },
  });

  assert.equal(rows.find((row) => row.key === "print-speed")?.value, "738 حرف/ثانية");
  assert.equal(rows.find((row) => row.key === "dot-matrix-pins")?.value, "24");
  assert.equal(rows.find((row) => row.key === "print-columns")?.value, "106");
  for (const hidden of ["color-count", "scanner", "adf", "ink-type"]) {
    assert.equal(rows.some((row) => row.key === hidden), false, `${hidden} must stay hidden for LQ`);
  }
});

test("hides empty quick-view fields and keeps false values explicit", () => {
  const rows = buildQuickViewSpecificationRows({
    printerCategory: "ecotank",
    specifications: {
      ...createEmptyPrinterSpecifications(),
      paperSize: "A4",
      wifi: false,
      usb: true,
    },
  });
  assert.deepEqual(rows.map((row) => [row.key, row.value]), [
    ["paper-size", "A4"],
    ["wifi", "لا"],
    ["usb", "نعم"],
  ]);
});

test("keeps cards concise and uses legacy values only without structured specifications", () => {
  assert.deepEqual(getProductCardSpecificationTags({
    specifications: { ...createEmptyPrinterSpecifications(), paperSize: "A3", printerType: "طباعة فقط", wifi: true },
    size: "A4",
    type: "متعددة الوظائف",
  }), ["A3", "طباعة فقط"]);
  assert.deepEqual(getProductCardSpecificationTags({ size: "A4", type: "متعددة الوظائف" }), ["A4", "متعددة الوظائف"]);
  assert.deepEqual(getProductCardSpecificationTags({ specifications: createEmptyPrinterSpecifications(), size: "A4", type: "متعددة الوظائف" }), []);
});
