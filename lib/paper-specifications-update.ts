import type { PaperSpecifications } from "../app/paper-specifications";

export type PaperSpecificationsUpdateTarget = {
  name: string;
  specifications: PaperSpecifications;
};

export type PaperSpecificationsUpdateRow = {
  id: number;
  name: string;
  specifications: unknown | null;
};

export type PaperSpecificationsUpdatePreviewProduct = {
  name: string;
  found: boolean;
  alreadyCurrent: boolean;
  changes: string[];
};

export type PaperSpecificationsUpdatePreview = {
  matchedCount: number;
  expectedCount: number;
  pendingCount: number;
  ready: boolean;
  names: string[];
  products: PaperSpecificationsUpdatePreviewProduct[];
};

const emptyFields = {
  nameAr: null,
  nameEn: null,
  brand: null,
  series: null,
  dimensions: null,
  printSides: null,
  selfAdhesive: null,
  thermalTransfer: null,
  inkCompatibility: null,
  quickDry: null,
  uses: [],
  availability: null,
};

export const PAPER_SPECIFICATIONS_UPDATE_TARGETS: readonly PaperSpecificationsUpdateTarget[] = [
  {
    name: "ATLAS Double Sides Glossy Inkjet Photo Paper 300gsm A4 – 50 Sheets",
    specifications: {
      ...emptyFields,
      paperType: null,
      surface: "Double Side Glossy",
      size: "A4",
      dimensions: "210x297 mm",
      weightGsm: 300,
      sheetCount: 50,
      printSides: "double",
      printerCompatibility: ["Inkjet"],
    },
  },
  {
    name: "ATLAS RC Glossy Photo Paper A4 260gsm – 20 Sheets",
    specifications: {
      ...emptyFields,
      paperType: "RC Photo Paper",
      surface: "RC Glossy",
      size: "A4",
      weightGsm: 260,
      sheetCount: 20,
      printerCompatibility: ["Inkjet"],
    },
  },
  {
    name: "ATLAS Self Adhesive Glossy Inkjet Photo Paper A4 150gsm – 50 Sheets",
    specifications: {
      ...emptyFields,
      paperType: "Self Adhesive Glossy",
      surface: "Glossy",
      size: "A4",
      weightGsm: 150,
      sheetCount: 50,
      printerCompatibility: ["Inkjet"],
      selfAdhesive: true,
    },
  },
  {
    name: "QM ROCK5 Double Side Matte Paper 120gsm",
    specifications: {
      ...emptyFields,
      paperType: null,
      surface: "Double Side Matte",
      size: null,
      weightGsm: 120,
      sheetCount: null,
      printSides: "double",
      printerCompatibility: ["Inkjet"],
    },
  },
  {
    name: "QM Inkjet High Glossy Photo Paper 180gsm",
    specifications: {
      ...emptyFields,
      paperType: "High Glossy Photo Paper",
      surface: "High Glossy",
      size: null,
      weightGsm: 180,
      sheetCount: null,
      printerCompatibility: ["Inkjet"],
    },
  },
  {
    name: "QM ROCK5 Inkjet Matte Paper 108gsm",
    specifications: {
      ...emptyFields,
      paperType: "Inkjet Matte",
      surface: "Matte",
      size: null,
      weightGsm: 108,
      sheetCount: null,
      printerCompatibility: ["Inkjet"],
    },
  },
  {
    name: "SQM Sublimation Transfer Paper A4 125gsm – 100 Sheets",
    specifications: {
      ...emptyFields,
      paperType: "Sublimation Transfer Paper",
      surface: null,
      size: "A4",
      weightGsm: 125,
      sheetCount: 100,
      printerCompatibility: [],
      thermalTransfer: true,
      inkCompatibility: "Sublimation Ink",
      quickDry: true,
    },
  },
  {
    name: "QM Premium RC Glossy Photo Paper 260gsm",
    specifications: {
      ...emptyFields,
      paperType: "RC Photo Paper",
      surface: "RC Glossy",
      size: null,
      weightGsm: 260,
      sheetCount: null,
      printerCompatibility: ["Inkjet"],
    },
  },
] as const;

const fieldLabels: Record<keyof PaperSpecifications, string> = {
  nameAr: "الاسم العربي",
  nameEn: "الاسم الإنجليزي",
  brand: "العلامة التجارية",
  series: "السلسلة",
  paperType: "نوع الورق",
  surface: "السطح",
  size: "المقاس",
  dimensions: "الأبعاد",
  weightGsm: "الوزن gsm",
  sheetCount: "عدد الأوراق",
  printSides: "أوجه الطباعة",
  printerCompatibility: "توافق الطابعات",
  selfAdhesive: "ذاتي اللصق",
  thermalTransfer: "سبلميشن / نقل حراري",
  inkCompatibility: "الحبر المتوافق",
  quickDry: "سريع الجفاف",
  uses: "الاستخدامات",
  availability: "التوفر",
};

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nestedValue]) => [key, canonicalize(nestedValue)]));
  }
  return value;
}

function comparableSpecifications(value: unknown) {
  return JSON.stringify(canonicalize(value ?? null));
}

function displayValue(value: PaperSpecifications[keyof PaperSpecifications]) {
  if (Array.isArray(value)) return value.length ? value.join("، ") : "فارغ";
  if (value === null) return "غير محدد";
  if (value === true) return "نعم";
  if (value === false) return "لا";
  if (value === "double") return "وجهين";
  return String(value);
}

export function buildPaperSpecificationsUpdatePreview(
  rows: readonly PaperSpecificationsUpdateRow[],
): PaperSpecificationsUpdatePreview {
  const rowsByName = new Map<string, PaperSpecificationsUpdateRow[]>();
  for (const row of rows) rowsByName.set(row.name, [...(rowsByName.get(row.name) ?? []), row]);

  const products = PAPER_SPECIFICATIONS_UPDATE_TARGETS.map((target) => {
    const matchingRows = rowsByName.get(target.name) ?? [];
    const found = matchingRows.length === 1;
    const alreadyCurrent = found
      && comparableSpecifications(matchingRows[0].specifications) === comparableSpecifications(target.specifications);
    const changes = Object.entries(target.specifications)
      .filter(([, value]) => value !== null && (!Array.isArray(value) || value.length > 0))
      .map(([key, value]) => `${fieldLabels[key as keyof PaperSpecifications]}: ${displayValue(value)}`);
    return { name: target.name, found, alreadyCurrent, changes };
  });
  const matchedCount = rows.length;
  const ready = matchedCount === PAPER_SPECIFICATIONS_UPDATE_TARGETS.length
    && products.every((product) => product.found);

  return {
    matchedCount,
    expectedCount: PAPER_SPECIFICATIONS_UPDATE_TARGETS.length,
    pendingCount: products.filter((product) => product.found && !product.alreadyCurrent).length,
    ready,
    names: products.map((product) => product.name),
    products,
  };
}
