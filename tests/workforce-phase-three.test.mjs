import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildQuickViewSpecificationRows,
  normalizePrinterSpecifications,
} from "../app/printer-specifications.ts";

const root = new URL("../", import.meta.url);
const migrationPath = "supabase/migrations/20260723_populate_workforce_phase_three_specifications.sql";
const read = (path) => readFile(new URL(path, root), "utf8");

const expectedProducts = {
  "EPSON WorkForce Pro EM-C800": {
    newName: "Epson WorkForce Pro EM-C800RDWF", family: "Epson WorkForce Pro", paperSize: "A4",
    speed: 25, adf: 50, standard: 330, maximum: 1830, inkSystem: "rips",
    wifi: "builtIn", fax: "builtIn", adfDuplexType: "singlePass",
    languages: ["PCL5c", "PCL6", "PostScript3", "PDF1.7", "ESC/P-R"],
  },
  "EPSON WorkForce Pro WF-C8690": {
    newName: "EPSON WorkForce Pro WF-C8690", family: "Epson WorkForce Pro", paperSize: "A3+",
    speed: 24, adf: 50, standard: 335, maximum: 1835, inkSystem: "cartridges",
    wifi: "builtIn", fax: "builtIn", duplexScanning: true, languages: ["PCL", "PostScript3"],
  },
  "EPSON WorkForce Pro WF-C5890": {
    newName: "EPSON WorkForce Pro WF-C5890", family: "Epson WorkForce Pro", paperSize: "A4",
    speed: 25, adf: 50, standard: 330, maximum: 1830, inkSystem: "cartridges",
    wifi: "builtIn", fax: "builtIn", languages: ["PCL5c", "PCL6", "PostScript3", "PDF1.7", "ESC/P-R"],
  },
  "EPSON WorkForce Pro WF-C5390": {
    newName: "EPSON WorkForce Pro WF-C5390", family: "Epson WorkForce Pro", paperSize: "A4",
    speed: 25, adf: null, standard: 330, maximum: 1830, inkSystem: "cartridges",
    wifi: "builtIn", fax: "none", scanner: false, functions: ["طباعة"],
    languages: ["PCL5c", "PCL6", "PostScript3", "PDF1.7", "ESC/P-R"],
  },
  "EPSON WorkForce Pro WF-C7835": {
    newName: "Epson WorkForce WF-7835DTWF", family: "Epson WorkForce", paperSize: "A3",
    speed: 25, adf: 50, standard: 500, maximum: 500, inkSystem: "cartridges",
    wifi: "builtIn", fax: "builtIn", duplexScanning: true, borderless: true, languages: ["ESC/P-R"],
  },
  "EPSON WorkForce Pro WF-C579R": {
    newName: "EPSON WorkForce Pro WF-C579R", family: "Epson WorkForce Pro", paperSize: "A4",
    speed: 24, adf: 50, standard: 330, maximum: 1330, inkSystem: "rips",
    wifi: "builtIn", fax: "builtIn", duplexScanning: true,
  },
  "EPSON WorkForce Pro WF-C8610": {
    newName: "EPSON WorkForce Pro WF-C8610", family: "Epson WorkForce Pro", paperSize: "A3+",
    speed: 24, adf: 50, standard: 335, maximum: 1835, inkSystem: "cartridges",
    wifi: "builtIn", fax: "builtIn", duplexScanning: true,
  },
  "EPSON WorkForce Pro WF-C878R": {
    newName: "EPSON WorkForce Pro WF-C878R", family: "Epson WorkForce Pro", paperSize: "A3+",
    speed: 25, adf: 50, standard: 335, maximum: 1835, inkSystem: "rips",
    wifi: "builtIn", fax: "builtIn", adfDuplexType: "singlePass",
  },
  "EPSON WorkForce Pro AM-C4000 / WF-C4000": {
    newName: "Epson WorkForce Enterprise AM-C4000", family: "Epson WorkForce Enterprise", paperSize: "A3",
    speed: 40, adf: 150, standard: 1150, maximum: 5150, inkSystem: "enterprise",
    wifi: "optional", fax: "optional", adfDuplexType: "singlePass", finisher: true,
  },
  "EPSON WorkForce Pro AM-C5000 / WF-C5000": {
    newName: "Epson WorkForce Enterprise AM-C5000", family: "Epson WorkForce Enterprise", paperSize: "A3",
    speed: 50, adf: 150, standard: 1150, maximum: 5150, inkSystem: "enterprise",
    wifi: "optional", fax: "optional", adfDuplexType: "singlePass", finisher: true,
  },
  "EPSON WorkForce Pro AM-C6000 / WF-C6000": {
    newName: "Epson WorkForce Enterprise AM-C6000", family: "Epson WorkForce Enterprise", paperSize: "A3",
    speed: 60, adf: 150, standard: 1150, maximum: 5150, inkSystem: "enterprise",
    wifi: "optional", fax: "optional", adfDuplexType: "singlePass", finisher: true,
  },
  "EPSON WorkForce Pro WF-C20750": {
    newName: "Epson WorkForce Enterprise WF-C20750", family: "Epson WorkForce Enterprise", paperSize: "A3+/SRA3",
    speed: 75, adf: 150, standard: 2350, maximum: 5350, inkSystem: "enterprise",
    wifi: "builtIn", fax: "optional", adfDuplexType: "singlePass", finisher: true,
    wifiDirect: true, nfc: true, languages: ["PCL5", "PCL6", "PostScript3"],
  },
};

async function parseApprovedProducts() {
  const migration = await read(migrationPath);
  const approvedBlock = migration.match(/with approved[\s\S]+?\n  update public\.products/)?.[0] ?? "";
  const tuplePattern = /\(\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'\[[^']*\]'::jsonb,\s*'(\{[^']+\})'::jsonb,\s*'(https:\/\/[^']+)'\s*\)/g;
  return {
    migration,
    approvedBlock,
    products: [...approvedBlock.matchAll(tuplePattern)].map((match) => ({
      oldName: match[1],
      newName: match[2],
      family: match[3],
      size: match[4],
      type: match[5],
      description: match[6],
      specifications: JSON.parse(match[7]),
      sourceUrl: match[8],
    })),
  };
}

test("WorkForce phase-three migration is local-only, transactional, exact and protected", async () => {
  const { migration, products } = await parseApprovedProducts();
  const lower = migration.toLowerCase();

  assert.match(lower, /^--[\s\S]*\nbegin;/);
  assert.match(lower, /commit;\s*$/);
  assert.equal(products.length, 12);
  assert.equal(Object.keys(expectedProducts).length, 12);
  assert.equal((lower.match(/update public\.products/g) ?? []).length, 1);
  assert.match(lower, /get diagnostics affected_rows = row_count/);
  assert.match(lower, /if affected_rows <> 12/);
  assert.match(lower, /if \(select count\(\*\) from public\.products\) <> 25/);
  assert.match(lower, /where product\.name = approved\.old_name\s+and product\.category = 'workforce'/);
  assert.match(lower, /specifications = coalesce\(product\.specifications, '\{\}'::jsonb\) \|\| approved\.specifications/);
  assert.match(lower, /non_target_fingerprint is distinct from non_target_fingerprint_after/);
  assert.match(lower, /protected_target_fingerprint is distinct from protected_target_fingerprint_after/);
  assert.match(lower, /product\.image is distinct from old\.image/);
  assert.match(lower, /product\.sort_order is distinct from old\.sort_order/);
  for (const forbidden of ["delete", "truncate", "drop", "insert into public.products", "setup.sql"]) {
    assert.equal(lower.includes(forbidden), false, `forbidden migration operation: ${forbidden}`);
  }
  assert.equal(products.filter((product) => product.oldName !== product.newName).length, 6);
  assert.deepEqual(
    products.map((product) => product.oldName).sort(),
    Object.keys(expectedProducts).sort(),
    "each approved old name must occur in exactly one values tuple",
  );
});

test("contains the twelve approved WorkForce values without guessing ADF duplex types", async () => {
  const { products } = await parseApprovedProducts();

  for (const product of products) {
    const expected = expectedProducts[product.oldName];
    assert.ok(expected, `unexpected product ${product.oldName}`);
    const specifications = product.specifications;
    assert.equal(product.newName, expected.newName);
    assert.equal(product.family, expected.family);
    assert.equal(product.size, expected.paperSize);
    assert.equal(specifications.paperSize, expected.paperSize);
    assert.equal(specifications.printTechnology, "PrecisionCore");
    assert.equal(specifications.colorCount, 4);
    assert.equal(specifications.colorMode, "ملونة");
    assert.equal(specifications.inkType, "حبر صبغي");
    assert.equal(specifications.duplexMode, "automatic");
    assert.equal(specifications.usb, true);
    assert.equal(specifications.ethernet, true);
    assert.equal(specifications.mobilePrinting, true);
    assert.equal(specifications.printSpeed, expected.speed);
    assert.equal(specifications.speedUnit, "صفحة/دقيقة");
    assert.equal(specifications.adfCapacity, expected.adf);
    assert.equal(specifications.standardPaperCapacity, expected.standard);
    assert.equal(specifications.maximumPaperCapacity, expected.maximum);
    assert.equal(specifications.inkSystem, expected.inkSystem);
    assert.equal(specifications.wifiAvailability, expected.wifi);
    assert.equal(specifications.faxMode, expected.fax);
    assert.equal(specifications.wifi, expected.wifi === "builtIn" ? true : null);
    assert.equal(specifications.fax, expected.fax === "builtIn" ? true : expected.fax === "none" ? false : null);
    assert.equal(specifications.adfDuplexType, expected.adfDuplexType ?? null);
    assert.equal(specifications.finisherSupport, expected.finisher ?? null);
    assert.equal(specifications.duplexScanning, expected.duplexScanning ?? (expected.adfDuplexType === "singlePass" ? true : product.oldName.endsWith("WF-C5390") ? false : null));
    assert.equal(specifications.borderless, expected.borderless ?? null);
    assert.equal(specifications.wifiDirect, expected.wifiDirect ?? null);
    assert.equal(specifications.nfc, expected.nfc ?? null);
    assert.deepEqual(specifications.printLanguages, expected.languages ?? []);
    assert.match(product.sourceUrl, /^https:\/\/(?:www\.)?epson\.(?:eu|com)\//);
  }
});

test("uses the approved RDWF source pages for WF-C579R and WF-C878R capacities", async () => {
  const { products, migration } = await parseApprovedProducts();
  assert.equal(
    products.find((product) => product.oldName.endsWith("WF-C579R"))?.sourceUrl,
    "https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-pro-wf-c579rdwf-printer/p/23014",
  );
  assert.equal(
    products.find((product) => product.oldName.endsWith("WF-C878R"))?.sourceUrl,
    "https://www.epson.eu/en_EU/products/printers/inkjet/business-inkjet/workforce-pro-wf-c878rdwf/p/28788",
  );
  assert.doesNotMatch(migration, /wf-c579rdtwf|wf-c878rdtwf/);
});

test("preserves the six approved Epson name corrections in the customer and admin data path", async () => {
  const defaults = await read("app/site-defaults.ts");
  const normalizer = defaults.match(/export function normalizeProductBrandName[\s\S]+?\n}/)?.[0] ?? "";
  assert.match(normalizer, /return value\.trim\(\)/);
  assert.doesNotMatch(normalizer, /replace|toUpperCase/);
});

test("renders all twelve WorkForce quick views with speed and without EcoTank or LQ-only fields", async () => {
  const { products } = await parseApprovedProducts();

  for (const product of products) {
    const specifications = normalizePrinterSpecifications(product.specifications);
    assert.ok(specifications);
    const rows = buildQuickViewSpecificationRows({ printerCategory: "workforce", specifications });
    assert.equal(rows.find((row) => row.key === "print-speed")?.value, `${product.specifications.printSpeed} صفحة/دقيقة`);
    assert.ok(rows.some((row) => row.key === "ink-system"));
    assert.ok(rows.some((row) => row.key === "standard-paper-capacity"));
    assert.ok(rows.some((row) => row.key === "maximum-paper-capacity"));
    for (const hidden of ["cd-dvd-printing", "plastic-card-printing", "photo-print-time", "dot-matrix-pins", "ribbon-yield"]) {
      assert.equal(rows.some((row) => row.key === hidden), false, `${hidden} must be hidden for ${product.newName}`);
    }
  }

  const amC4000 = products.find((product) => product.newName.endsWith("AM-C4000"));
  const optionalRows = buildQuickViewSpecificationRows({
    printerCategory: "workforce",
    specifications: normalizePrinterSpecifications(amC4000.specifications),
  });
  assert.equal(optionalRows.find((row) => row.key === "wifi-availability")?.value, "اختياري");
  assert.equal(optionalRows.find((row) => row.key === "fax-mode")?.value, "اختياري");

  const c5390 = products.find((product) => product.newName.endsWith("WF-C5390"));
  const printOnlyRows = buildQuickViewSpecificationRows({
    printerCategory: "workforce",
    specifications: normalizePrinterSpecifications(c5390.specifications),
  });
  assert.equal(printOnlyRows.find((row) => row.key === "functions")?.value, "طباعة فقط");
  for (const hidden of ["scanner", "fax", "fax-mode", "adf", "adf-capacity", "duplex-scanning", "adf-duplex-type"]) {
    assert.equal(printOnlyRows.some((row) => row.key === hidden), false, `${hidden} must be hidden for WF-C5390`);
  }
});

test("admin exposes WorkForce-only controls and preserves legacy compatibility fields", async () => {
  const [admin, shared] = await Promise.all([
    read("app/admin/admin-dashboard.tsx"),
    read("app/printer-specifications.ts"),
  ]);
  for (const expected of [
    "مواصفات WorkForce للأعمال", "توفر Wi-Fi", "توفر الفاكس", "نظام الحبر",
    "مسح الوجهين", "نوع مسح ADF على الوجهين", "سعة الورق القياسية",
    "سعة الورق القصوى", "لغات الطباعة", "دعم وحدات التشطيب",
  ]) {
    assert.match(admin, new RegExp(expected));
  }
  assert.match(admin, /const isWorkForce = product\.printerCategory === "workforce"/);
  assert.match(admin, /wifiAvailability === "builtIn" \? true : wifiAvailability === "none" \? false : null/);
  assert.match(admin, /faxMode === "builtIn" \? true : faxMode === "none" \? false : null/);
  assert.match(shared, /wifiAvailability: nullableAvailabilityMode\(input\.wifiAvailability\) \?\?/);
  assert.match(shared, /faxMode: nullableAvailabilityMode\(input\.faxMode\) \?\?/);
});
