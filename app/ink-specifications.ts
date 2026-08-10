import type { SpecificationDisplayRow } from "./printer-specifications";

export type InkSpecifications = {
  images: string[];
  brand: string | null;
  inkType: string | null;
  colorCount: InkColorCount | null;
  capacities: string[];
  compatiblePrinters: string[];
  features: string[];
  uses: string[];
};

export const INK_TYPE_OPTIONS = ["Dye", "Pigment", "Sublimation", "Eco-Solvent", "UV Ink", "DTF", "أخرى"] as const;
export const INK_COLOR_COUNT_OPTIONS = ["4 ألوان", "5 ألوان", "6 ألوان", "أخرى"] as const;
export type InkColorCount = typeof INK_COLOR_COUNT_OPTIONS[number];
export const INK_CAPACITY_OPTIONS = ["70 مل", "100 مل", "500 مل", "1000 مل"] as const;

export function getInkProductNameError(name: string, _capacities: string[]) {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  if (!normalizedName) return "يجب إدخال اسم لمنتج الحبر.";
  if (normalizedName.length > 80) return "اسم منتج الحبر طويل.";

  return null;
}

export function createEmptyInkSpecifications(): InkSpecifications {
  return { images: [], brand: null, inkType: null, colorCount: null, capacities: [], compatiblePrinters: [], features: [], uses: [] };
}

function textOrNull(value: unknown, maxLength = 160) {
  const text = typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  return text || null;
}

function stringList(value: unknown, maxItems = 30) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim().slice(0, 180)).filter(Boolean))].slice(0, maxItems);
}

function inkColorCountOrNull(value: unknown): InkColorCount | null {
  return INK_COLOR_COUNT_OPTIONS.find((option) => option === value) ?? null;
}

export function normalizeInkSpecifications(value: unknown): InkSpecifications | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  // `color` remains a recognized legacy key so existing products still load,
  // but color names are intentionally not mapped to the new count field.
  if (!["images", "brand", "inkType", "colorCount", "color", "capacities", "compatiblePrinters", "features", "uses"].some((key) => Object.hasOwn(input, key))) return undefined;
  return {
    images: stringList(input.images, 50),
    brand: textOrNull(input.brand, 120),
    inkType: textOrNull(input.inkType, 80),
    colorCount: inkColorCountOrNull(input.colorCount),
    capacities: stringList(input.capacities),
    compatiblePrinters: stringList(input.compatiblePrinters),
    features: stringList(input.features),
    uses: stringList(input.uses),
  };
}

type InkDisplayInput = { inkSpecifications?: InkSpecifications };

export function getInkCardSpecificationTags(product: InkDisplayInput) {
  const specifications = product.inkSpecifications;
  if (!specifications) return [];
  return [specifications.brand, specifications.inkType, specifications.colorCount, ...specifications.capacities]
    .filter((value): value is string => Boolean(value))
    .slice(0, 4);
}

export function buildInkSpecificationRows(product: InkDisplayInput): SpecificationDisplayRow[] {
  const specifications = product.inkSpecifications;
  if (!specifications) return [];
  return [
    specifications.brand ? { key: "brand", label: "العلامة التجارية", value: specifications.brand } : null,
    specifications.inkType ? { key: "ink-type", label: "نوع الحبر", value: specifications.inkType } : null,
    specifications.colorCount ? { key: "color-count", label: "عدد الألوان", value: specifications.colorCount } : null,
    specifications.capacities.length ? { key: "capacities", label: "السعات المتوفرة", value: specifications.capacities.join("، ") } : null,
    specifications.compatiblePrinters.length ? { key: "compatible-printers", label: "الطابعات المتوافقة", value: specifications.compatiblePrinters.join("، ") } : null,
    specifications.features.length ? { key: "features", label: "الخصائص", value: specifications.features.join("، ") } : null,
    specifications.uses.length ? { key: "uses", label: "الاستخدامات", value: specifications.uses.join("، ") } : null,
  ].filter((row): row is SpecificationDisplayRow => Boolean(row));
}
