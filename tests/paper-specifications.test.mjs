import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPaperSpecificationRows,
  createEmptyPaperSpecifications,
  getPaperCardSpecificationTags,
  isDoubleSidePaperType,
  isSelfAdhesivePaperType,
  isSublimationPaperType,
  normalizePaperSpecifications,
} from "../app/paper-specifications.ts";

test("normalizes paper specifications and keeps existing products compatible", () => {
  assert.equal(normalizePaperSpecifications(undefined), undefined);
  assert.equal(normalizePaperSpecifications({ paperSize: null, printerType: null, functions: [] }), undefined);
  assert.deepEqual(normalizePaperSpecifications({
    nameAr: " ورق صور ",
    nameEn: " Photo Paper ",
    brand: "Epson",
    paperType: "Double Side Matte",
    printSides: "single",
    weightGsm: "220",
    sheetCount: "50",
    printerCompatibility: ["Inkjet", "Inkjet"],
    uses: ["الصور", "الصور"],
  }), {
    ...createEmptyPaperSpecifications(),
    nameAr: "ورق صور",
    nameEn: "Photo Paper",
    brand: "Epson",
    paperType: "Double Side Matte",
    printSides: "double",
    weightGsm: 220,
    sheetCount: 50,
    printerCompatibility: ["Inkjet"],
    uses: ["الصور"],
  });
});

test("paper types drive only their relevant dynamic fields", () => {
  assert.equal(isSublimationPaperType("Sublimation Transfer Paper"), true);
  assert.equal(isSelfAdhesivePaperType("Self Adhesive Glossy"), true);
  assert.equal(isDoubleSidePaperType("Double Side Glossy"), true);

  const sublimation = normalizePaperSpecifications({
    paperType: "Sublimation Transfer Paper",
    thermalTransfer: true,
    inkCompatibility: "حبر سبلميشن",
    quickDry: true,
    selfAdhesive: true,
  });
  assert.equal(sublimation?.thermalTransfer, true);
  assert.equal(sublimation?.inkCompatibility, "حبر سبلميشن");
  assert.equal(sublimation?.quickDry, true);
  assert.equal(sublimation?.selfAdhesive, null);

  const regular = normalizePaperSpecifications({
    paperType: "Photo Paper",
    thermalTransfer: true,
    inkCompatibility: "حبر سبلميشن",
    quickDry: true,
  });
  assert.equal(regular?.thermalTransfer, null);
  assert.equal(regular?.inkCompatibility, null);
  assert.equal(regular?.quickDry, null);
});

test("builds the four requested card specifications and organized details", () => {
  const paperSpecifications = normalizePaperSpecifications({
    nameAr: "ورق صور لامع",
    nameEn: "Glossy Photo Paper",
    brand: "Epson",
    series: "Premium",
    paperType: "Photo Paper",
    surface: "Glossy",
    size: "A4",
    dimensions: "210 × 297 mm",
    weightGsm: 200,
    sheetCount: 100,
    printSides: "single",
    printerCompatibility: ["Inkjet", "EcoTank"],
    uses: ["الصور"],
    availability: "inStock",
  });
  assert.ok(paperSpecifications);

  assert.deepEqual(getPaperCardSpecificationTags({ paperSpecifications }), [
    "A4 · 210 × 297 mm",
    "200 gsm",
    "100 ورقة",
    "Photo Paper · Glossy",
  ]);

  const rows = buildPaperSpecificationRows({ paperSpecifications });
  assert.equal(rows.find((row) => row.key === "weight")?.value, "200 gsm");
  assert.equal(rows.find((row) => row.key === "sheet-count")?.value, "100 ورقة");
  assert.equal(rows.find((row) => row.key === "availability")?.value, "متوفر");
});

test("falls back to legacy paper fields without changing existing products", () => {
  assert.deepEqual(getPaperCardSpecificationTags({
    size: "A4",
    type: "Glossy",
    features: ["200 gsm", "100 ورقة"],
  }), ["A4", "Glossy", "200 gsm", "100 ورقة"]);

  assert.deepEqual(buildPaperSpecificationRows({
    size: "A4",
    type: "Glossy",
    features: ["200 gsm"],
  }).map(({ label, value }) => [label, value]), [
    ["المقاس", "A4"],
    ["نوع الورق", "Glossy"],
    ["ميزة", "200 gsm"],
  ]);
});
