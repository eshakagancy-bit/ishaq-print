import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildQuickViewSpecificationRows,
  normalizePrinterSpecifications,
} from "../app/printer-specifications.ts";

const migrationUrl = new URL("../supabase/migrations/20260722_populate_ecotank_phase_two_specifications.sql", import.meta.url);

const expectedProducts = {
  "EPSON EcoTank L11050": { category: "ecotank", paperSize: "A3+", colorCount: 4, duplexMode: null, wifiDirect: true, cdDvdPrinting: false, plasticCardPrinting: false },
  "EPSON EcoTank L15150": { category: "ecotank", paperSize: "A3+", colorCount: 4, duplexMode: "automatic", wifiDirect: true, cdDvdPrinting: false, plasticCardPrinting: false, adfCapacity: 50 },
  "EPSON EcoTank L18050": { category: "ecotank-6-color", paperSize: "A3+", colorCount: 6, duplexMode: "manual", wifiDirect: true, cdDvdPrinting: true, plasticCardPrinting: true },
  "EPSON EcoTank L3210": { category: "ecotank", paperSize: "A4", colorCount: 4, duplexMode: "manual", wifiDirect: false, cdDvdPrinting: false, plasticCardPrinting: false },
  "EPSON EcoTank L3250": { category: "ecotank", paperSize: "A4", colorCount: 4, duplexMode: "manual", wifiDirect: true, cdDvdPrinting: false, plasticCardPrinting: false },
  "EPSON EcoTank L4260": { category: "ecotank", paperSize: "A4", colorCount: 4, duplexMode: "automatic", wifiDirect: true, cdDvdPrinting: false, plasticCardPrinting: false },
  "EPSON EcoTank L6270": { category: "ecotank", paperSize: "A4", colorCount: 4, duplexMode: "automatic", wifiDirect: true, cdDvdPrinting: false, plasticCardPrinting: false, adfCapacity: 30 },
  "EPSON EcoTank L6490": { category: "ecotank", paperSize: "A4", colorCount: 4, duplexMode: "automatic", wifiDirect: true, cdDvdPrinting: false, plasticCardPrinting: false, adfCapacity: 35 },
  "EPSON EcoTank L8050": { category: "ecotank-6-color", paperSize: "A4", colorCount: 6, duplexMode: "manual", wifiDirect: true, cdDvdPrinting: true, plasticCardPrinting: true },
  "EPSON EcoTank L8180": { category: "ecotank-6-color", paperSize: "A3+", colorCount: 6, duplexMode: "automatic", wifiDirect: true, cdDvdPrinting: true, plasticCardPrinting: null },
};

function extractApprovedProducts(migration) {
  const approvedBlock = migration.match(/with approved[\s\S]+?\n  update public\.products/)?.[0] ?? "";
  return Object.fromEntries(Object.keys(expectedProducts).map((name) => {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = approvedBlock.match(new RegExp(`'${escapedName}',\\s*'([^']+)'[\\s\\S]+?'(\\{[^']+\\})'::jsonb,`));
    assert.ok(match, `approved migration values missing for ${name}`);
    return [name, { category: match[1], specifications: JSON.parse(match[2]) }];
  }));
}

test("contains the approved structured values for exactly ten EcoTank products", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const products = extractApprovedProducts(migration);
  assert.equal(Object.keys(products).length, 10);

  for (const [name, expected] of Object.entries(expectedProducts)) {
    const product = products[name];
    assert.equal(product.category, expected.category, `${name}: category`);
    for (const [key, value] of Object.entries(expected)) {
      if (key !== "category") assert.deepEqual(product.specifications[key], value, `${name}: ${key}`);
    }
    assert.equal("printSpeed" in product.specifications, false, `${name}: print speed must not be populated`);
    assert.equal("speedUnit" in product.specifications, false, `${name}: speed unit must not be populated`);
    assert.equal("photoPrintTimeSeconds" in product.specifications, false, `${name}: photo time must remain unknown`);
  }
});

test("renders every approved EcoTank quick view without speed or empty values", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const products = extractApprovedProducts(migration);
  const duplexLabels = {
    none: "لا يوجد طباعة على الوجهين",
    manual: "طباعة يدوية على الوجهين",
    automatic: "طباعة تلقائية على الوجهين",
  };

  for (const [name, product] of Object.entries(products)) {
    const specifications = normalizePrinterSpecifications({
      ...product.specifications,
      printSpeed: 777,
      speedUnit: "صفحة/دقيقة",
    });
    assert.ok(specifications, `${name}: specifications normalize`);
    const rows = buildQuickViewSpecificationRows({ printerCategory: product.category, specifications });
    assert.equal(rows.some((row) => row.key === "print-speed"), false, `${name}: speed hidden`);
    assert.equal(rows.some((row) => !row.value.trim() || row.value === "غير محدد"), false, `${name}: no empty display rows`);
    if (product.specifications.duplexMode === null) {
      assert.equal(rows.some((row) => row.key === "duplex-mode" || row.key === "duplex"), false, `${name}: unknown duplex hidden`);
    } else {
      assert.equal(rows.find((row) => row.key === "duplex-mode")?.value, duplexLabels[product.specifications.duplexMode], `${name}: duplex wording`);
    }
    if (name === "EPSON EcoTank L11050") {
      assert.equal(rows.some((row) => row.key === "borderless"), false, `${name}: unknown borderless support hidden`);
    }
    assert.equal(rows.find((row) => row.key === "wifi-direct")?.value, product.specifications.wifiDirect ? "نعم" : "لا", `${name}: Wi-Fi Direct`);
    assert.equal(rows.some((row) => row.key === "photo-print-time"), false, `${name}: unknown photo time hidden`);
  }
});
