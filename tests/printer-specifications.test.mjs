import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQuickViewSpecificationRows,
  createEmptyPrinterSpecifications,
  duplexModeToFormValue,
  formValueToDuplexMode,
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

test("preserves the detailed duplex mode and supports the legacy duplex fallback", () => {
  assert.equal(formValueToDuplexMode("none"), "none");
  assert.equal(formValueToDuplexMode("manual"), "manual");
  assert.equal(formValueToDuplexMode("automatic"), "automatic");
  assert.equal(formValueToDuplexMode("unknown"), null);
  assert.equal(duplexModeToFormValue(null), "unknown");
  assert.equal(duplexModeToFormValue("manual"), "manual");
  assert.equal(normalizePrinterSpecifications({ duplex: true })?.duplexMode, "automatic");
  assert.equal(normalizePrinterSpecifications({ duplex: false })?.duplexMode, null);
  assert.equal(normalizePrinterSpecifications({ duplex: true, duplexMode: "manual" })?.duplexMode, "manual");
});

test("shows dot-matrix fields and characters per second while hiding inkjet-only fields", () => {
  const rows = buildQuickViewSpecificationRows({
    printerCategory: "lq",
    specifications: {
      ...createEmptyPrinterSpecifications(),
      printerType: "طابعة نقطية",
      functions: ["طباعة"],
      printTechnology: "مصفوفة نقطية تصادمية، 24 إبرة",
      printSpeed: 529,
      speedUnit: "حرف/ثانية",
      colorCount: 4,
      mobilePrinting: false,
      scanner: false,
      fax: false,
      adf: false,
      borderless: false,
      usb: true,
      parallel: true,
      serial: false,
      optionalInterface: false,
      inkType: "شريط طباعة",
      dotMatrixPins: 24,
      printColumns: 106,
      multipartCopies: 6,
      ribbonYield: 10000000,
    },
  });

  assert.equal(rows.find((row) => row.key === "functions")?.value, "طباعة فقط");
  assert.equal(rows.find((row) => row.key === "print-speed")?.value, "529 حرف/ثانية");
  assert.equal(rows.find((row) => row.key === "dot-matrix-pins")?.value, "24");
  assert.equal(rows.find((row) => row.key === "print-columns")?.value, "106");
  assert.equal(rows.find((row) => row.key === "multipart-copies")?.value, "أصل + 6 نسخ");
  assert.equal(rows.find((row) => row.key === "ribbon-yield")?.value, "10 مليون حرف");
  assert.equal(rows.find((row) => row.key === "ink-type")?.value, "شريط طباعة");
  for (const shown of ["usb", "parallel", "serial", "optional-interface", "ink-type"]) {
    assert.equal(rows.some((row) => row.key === shown), true, `${shown} must be shown for LQ when defined`);
  }
  for (const hidden of ["color-count", "scanner", "fax", "adf", "borderless", "mobile-printing"]) {
    assert.equal(rows.some((row) => row.key === hidden), false, `${hidden} must stay hidden for LQ`);
  }
});

test("normalizes the three LQ interface fields as tri-state values", () => {
  const specifications = normalizePrinterSpecifications({ parallel: true, serial: false, optionalInterface: "yes" });
  assert.equal(specifications?.parallel, true);
  assert.equal(specifications?.serial, false);
  assert.equal(specifications?.optionalInterface, null);
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

test("shows EcoTank-only fields, Arabic duplex wording and never exposes stored speed", () => {
  const rows = buildQuickViewSpecificationRows({
    printerCategory: "ecotank-6-color",
    specifications: {
      ...createEmptyPrinterSpecifications(),
      paperSize: "A3+",
      colorCount: 6,
      wifiDirect: true,
      duplexMode: "manual",
      cdDvdPrinting: true,
      plasticCardPrinting: false,
      photoPrintTimeSeconds: 25,
      printSpeed: 99,
      speedUnit: "صفحة/دقيقة",
    },
  });

  assert.equal(rows.find((row) => row.key === "duplex-mode")?.value, "طباعة يدوية على الوجهين");
  assert.equal(rows.find((row) => row.key === "wifi-direct")?.value, "نعم");
  assert.equal(rows.find((row) => row.key === "cd-dvd-printing")?.value, "نعم");
  assert.equal(rows.find((row) => row.key === "plastic-card-printing")?.value, "لا");
  assert.equal(rows.find((row) => row.key === "photo-print-time")?.value, "25 ثانية");
  assert.equal(rows.some((row) => row.key === "print-speed"), false);
});

test("keeps speed visible outside EcoTank categories", () => {
  const rows = buildQuickViewSpecificationRows({
    printerCategory: "workforce",
    specifications: { ...createEmptyPrinterSpecifications(), printSpeed: 25, speedUnit: "صفحة/دقيقة" },
  });
  assert.equal(rows.find((row) => row.key === "print-speed")?.value, "25 صفحة/دقيقة");
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
