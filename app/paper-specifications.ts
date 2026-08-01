import type { SpecificationDisplayRow } from "./printer-specifications";

export type PaperBoolean = boolean | null;
export type PaperPrintSides = "single" | "double" | null;
export type PaperAvailability = "inStock" | "outOfStock" | "onRequest" | null;

export type PaperSpecifications = {
  images?: string[];
  nameAr: string | null;
  nameEn: string | null;
  brand: string | null;
  series: string | null;
  paperType: string | null;
  surface: string | null;
  size: string | null;
  dimensions: string | null;
  weightGsm: number | null;
  sheetCount: number | null;
  printSides: PaperPrintSides;
  printerCompatibility: string[];
  selfAdhesive: PaperBoolean;
  thermalTransfer: PaperBoolean;
  inkCompatibility: string | null;
  quickDry: PaperBoolean;
  uses: string[];
  availability: PaperAvailability;
};

export const PAPER_TYPE_OPTIONS = [
  "Photo Paper",
  "RC Photo Paper",
  "High Glossy",
  "Double Side Glossy",
  "Double Side Matte",
  "Inkjet Matte",
  "Self Adhesive Glossy",
  "Sublimation Transfer Paper",
  "Other",
] as const;

export const PAPER_SURFACE_OPTIONS = ["Glossy", "High Glossy", "Matte", "Satin", "Luster", "Other"] as const;
export const PAPER_SIZE_OPTIONS = ["A4", "A3", "A3+", "A5", "10×15 سم", "13×18 سم", "20×30 سم", "رول", "Other"] as const;
export const PAPER_PRINTER_COMPATIBILITY_OPTIONS = ["Inkjet", "Laser", "EcoTank", "طابعات السبلميشن", "Other"] as const;
export const PAPER_USAGE_OPTIONS = ["الصور", "الاستوديوهات", "الهدايا", "الملصقات", "المكاتب", "الدعاية والإعلان", "نقل حراري"] as const;
export const PAPER_PRINT_SIDE_OPTIONS = [
  { value: "unknown", label: "غير محدد" },
  { value: "single", label: "وجه واحد" },
  { value: "double", label: "وجهين" },
] as const;
export const PAPER_AVAILABILITY_OPTIONS = [
  { value: "unknown", label: "غير محدد" },
  { value: "inStock", label: "متوفر" },
  { value: "outOfStock", label: "غير متوفر" },
  { value: "onRequest", label: "حسب الطلب" },
] as const;

export function createEmptyPaperSpecifications(): PaperSpecifications {
  return {
    images: [],
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
}

function textOrNull(value: unknown, maxLength = 180) {
  const text = typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  return text || null;
}

function numberOrNull(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function booleanOrNull(value: unknown): PaperBoolean {
  return typeof value === "boolean" ? value : null;
}

function stringList(value: unknown, maxItems = 12) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim()).filter(Boolean))].slice(0, maxItems);
}

export function isSublimationPaperType(value: string | null | undefined) {
  return value === "Sublimation Transfer Paper";
}

export function isSelfAdhesivePaperType(value: string | null | undefined) {
  return value === "Self Adhesive Glossy";
}

export function isDoubleSidePaperType(value: string | null | undefined) {
  return value === "Double Side Glossy" || value === "Double Side Matte";
}

export function normalizePaperSpecifications(value: unknown): PaperSpecifications | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  const paperKeys: ReadonlyArray<keyof PaperSpecifications> = [
    "images", "nameAr", "nameEn", "brand", "series", "paperType", "surface", "size", "dimensions",
    "weightGsm", "sheetCount", "printSides", "printerCompatibility", "selfAdhesive",
    "thermalTransfer", "inkCompatibility", "quickDry", "uses", "availability",
  ];
  if (!paperKeys.some((key) => Object.hasOwn(input, key))) return undefined;
  const paperType = textOrNull(input.paperType, 100);
  const printSides = isDoubleSidePaperType(paperType)
    ? "double"
    : input.printSides === "single" || input.printSides === "double" ? input.printSides : null;
  const availability = input.availability === "inStock" || input.availability === "outOfStock" || input.availability === "onRequest"
    ? input.availability
    : null;

  return {
    images: stringList(input.images, 12),
    nameAr: textOrNull(input.nameAr),
    nameEn: textOrNull(input.nameEn),
    brand: textOrNull(input.brand, 120),
    series: textOrNull(input.series, 120),
    paperType,
    surface: textOrNull(input.surface, 100),
    size: textOrNull(input.size, 100),
    dimensions: textOrNull(input.dimensions, 100),
    weightGsm: numberOrNull(input.weightGsm),
    sheetCount: numberOrNull(input.sheetCount),
    printSides,
    printerCompatibility: stringList(input.printerCompatibility),
    selfAdhesive: isSelfAdhesivePaperType(paperType) ? true : null,
    thermalTransfer: isSublimationPaperType(paperType) ? booleanOrNull(input.thermalTransfer) : null,
    inkCompatibility: isSublimationPaperType(paperType) ? textOrNull(input.inkCompatibility, 120) : null,
    quickDry: isSublimationPaperType(paperType) ? booleanOrNull(input.quickDry) : null,
    uses: stringList(input.uses),
    availability,
  };
}

type PaperDisplayInput = {
  paperSpecifications?: PaperSpecifications;
  type?: string;
  size?: string;
  features?: string[];
};

function yesNoRow(key: string, label: string, value: PaperBoolean): SpecificationDisplayRow | null {
  if (value === null) return null;
  return { key, label, value: value ? "نعم" : "لا", state: value };
}

const availabilityLabels: Record<Exclude<PaperAvailability, null>, string> = {
  inStock: "متوفر",
  outOfStock: "غير متوفر",
  onRequest: "حسب الطلب",
};

export function getPaperCardSpecificationTags(product: PaperDisplayInput) {
  const specifications = product.paperSpecifications;
  if (!specifications) {
    return [product.size, product.type, ...(product.features ?? []).slice(0, 2)]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
      .slice(0, 4);
  }
  const size = [specifications.size, specifications.dimensions].filter(Boolean).join(" · ");
  const kind = [...new Set([specifications.paperType, specifications.surface].filter(Boolean))].join(" · ");
  return [
    size,
    specifications.weightGsm !== null ? `${specifications.weightGsm} gsm` : "",
    specifications.sheetCount !== null ? `${specifications.sheetCount} ورقة` : "",
    kind,
  ].filter(Boolean);
}

export function buildPaperSpecificationRows(product: PaperDisplayInput): SpecificationDisplayRow[] {
  const specifications = product.paperSpecifications;
  if (!specifications) {
    return [
      ...(product.size?.trim() ? [{ key: "legacy-size", label: "المقاس", value: product.size.trim() }] : []),
      ...(product.type?.trim() ? [{ key: "legacy-type", label: "نوع الورق", value: product.type.trim() }] : []),
      ...(product.features ?? []).filter(Boolean).map((feature, index) => ({ key: `legacy-feature-${index}`, label: "ميزة", value: feature })),
    ];
  }

  const rows: Array<SpecificationDisplayRow | null> = [
    specifications.nameAr ? { key: "name-ar", label: "الاسم العربي", value: specifications.nameAr } : null,
    specifications.nameEn ? { key: "name-en", label: "الاسم الإنجليزي", value: specifications.nameEn } : null,
    specifications.brand ? { key: "brand", label: "العلامة التجارية", value: specifications.brand } : null,
    specifications.series ? { key: "series", label: "السلسلة", value: specifications.series } : null,
    specifications.paperType ? { key: "paper-type", label: "نوع الورق", value: specifications.paperType } : null,
    specifications.surface ? { key: "surface", label: "السطح", value: specifications.surface } : null,
    specifications.size ? { key: "size", label: "المقاس", value: specifications.size } : null,
    specifications.dimensions ? { key: "dimensions", label: "الأبعاد", value: specifications.dimensions } : null,
    specifications.weightGsm !== null ? { key: "weight", label: "الوزن", value: `${specifications.weightGsm} gsm` } : null,
    specifications.sheetCount !== null ? { key: "sheet-count", label: "عدد الأوراق", value: `${specifications.sheetCount} ورقة` } : null,
    specifications.printSides ? { key: "print-sides", label: "أوجه الطباعة", value: specifications.printSides === "double" ? "وجهين" : "وجه واحد" } : null,
    specifications.printerCompatibility.length ? { key: "printer-compatibility", label: "توافق الطابعات", value: specifications.printerCompatibility.join("، ") } : null,
    yesNoRow("self-adhesive", "ذاتي اللصق", specifications.selfAdhesive),
    isSublimationPaperType(specifications.paperType) ? yesNoRow("thermal-transfer", "سبلميشن / نقل حراري", specifications.thermalTransfer) : null,
    isSublimationPaperType(specifications.paperType) && specifications.inkCompatibility
      ? { key: "ink-compatibility", label: "الحبر المتوافق", value: specifications.inkCompatibility }
      : null,
    isSublimationPaperType(specifications.paperType) ? yesNoRow("quick-dry", "سريع الجفاف", specifications.quickDry) : null,
    specifications.uses.length ? { key: "uses", label: "الاستخدامات", value: specifications.uses.join("، ") } : null,
    specifications.availability ? { key: "availability", label: "التوفر", value: availabilityLabels[specifications.availability] } : null,
  ];
  return rows.filter((row): row is SpecificationDisplayRow => Boolean(row));
}
