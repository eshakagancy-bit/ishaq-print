import type { PaperSpecifications } from "../app/paper-specifications";

export type PaperSpecificationsUpdateTarget = {
  name: string;
  patch: Partial<PaperSpecifications>;
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

export const PAPER_SPECIFICATIONS_UPDATE_TARGETS: readonly PaperSpecificationsUpdateTarget[] = [
  {
    name: "ATLAS Double Sides Glossy Inkjet Photo Paper 300gsm A4 – 50 Sheets",
    patch: {
      nameAr: "ورق صور ATLAS لامع وجهين A4 وزن 300 جم – 50 ورقة",
      paperType: "Double Side Glossy",
      size: "A4",
      weightGsm: 300,
      sheetCount: 50,
      printSides: "double",
    },
  },
  {
    name: "ATLAS RC Glossy Photo Paper A4 260gsm – 20 Sheets",
    patch: {
      nameAr: "ورق صور ATLAS RC Glossy A4 وزن 260 جم – 20 ورقة",
      paperType: "RC Photo Paper",
      surface: "RC Glossy",
      size: "A4",
      weightGsm: 260,
      sheetCount: 20,
    },
  },
  {
    name: "ATLAS Self Adhesive Glossy Inkjet Photo Paper A4 150gsm – 50 Sheets",
    patch: {
      nameAr: "ورق استيكر ATLAS لامع ذاتي اللصق A4 وزن 150 جم – 50 ورقة",
      paperType: "Self Adhesive Glossy",
      size: "A4",
      weightGsm: 150,
      sheetCount: 50,
      selfAdhesive: true,
    },
  },
  {
    name: "QM ROCK5 Double Side Matte Paper 120gsm",
    patch: {
      nameAr: "ورق QM ROCK5 مطفي وجهين وزن 120 جم",
      paperType: "Double Side Matte",
      weightGsm: 120,
      printSides: "double",
    },
  },
  {
    name: "QM Inkjet High Glossy Photo Paper 180gsm",
    patch: {
      nameAr: "ورق صور QM شديد اللمعان وزن 180 جم",
      paperType: "High Glossy Photo Paper",
      weightGsm: 180,
    },
  },
  {
    name: "QM ROCK5 Inkjet Matte Paper 108gsm",
    patch: {
      nameAr: "ورق QM ROCK5 مطفي للطباعة النافثة للحبر وزن 108 جم",
      paperType: "Inkjet Matte",
      weightGsm: 108,
    },
  },
  {
    name: "SQM Sublimation Transfer Paper A4 125gsm – 100 Sheets",
    patch: {
      nameAr: "ورق سبلميشن SQM A4 سريع الجفاف وزن 125 جم – 100 ورقة",
      paperType: "Sublimation Transfer Paper",
      size: "A4",
      weightGsm: 125,
      sheetCount: 100,
      thermalTransfer: true,
      quickDry: true,
    },
  },
  {
    name: "QM Premium RC Glossy Photo Paper 260gsm",
    patch: {
      nameAr: "ورق صور QM Premium RC Glossy وزن 260 جم",
      paperType: "Premium RC Glossy Photo Paper",
      weightGsm: 260,
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

const emptySpecifications: PaperSpecifications = {
  nameAr: null,
  nameEn: null,
  brand: null,
  series: null,
  paperType: null,
  surface: null,
  size: null,
  dimensions: null,
  weightGsm: null,
  sheetCount: null,
  printSides: null,
  printerCompatibility: [],
  selfAdhesive: null,
  thermalTransfer: null,
  inkCompatibility: null,
  quickDry: null,
  uses: [],
  availability: null,
};

export function mergePaperSpecificationsUpdate(
  current: unknown,
  patch: Partial<PaperSpecifications>,
): PaperSpecifications {
  const currentObject = current && typeof current === "object" && !Array.isArray(current)
    ? current as Partial<PaperSpecifications>
    : {};
  return {
    ...emptySpecifications,
    ...currentObject,
    ...patch,
    printerCompatibility: Array.isArray(currentObject.printerCompatibility)
      ? currentObject.printerCompatibility
      : [],
    uses: Array.isArray(currentObject.uses) ? currentObject.uses : [],
  };
}

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
    const desired = found
      ? mergePaperSpecificationsUpdate(matchingRows[0].specifications, target.patch)
      : null;
    const alreadyCurrent = found
      && comparableSpecifications(matchingRows[0].specifications) === comparableSpecifications(desired);
    const changes = Object.entries(target.patch)
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
