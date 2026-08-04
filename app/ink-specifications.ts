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

export const INK_TYPE_OPTIONS = ["Dye", "Pigment", "Sublimation", "Eco-Solvent", "UV Ink", "أخرى"] as const;
export const INK_COLOR_COUNT_OPTIONS = ["4 ألوان", "5 ألوان", "6 ألوان", "أخرى"] as const;
export type InkColorCount = typeof INK_COLOR_COUNT_OPTIONS[number];
export const INK_CAPACITY_OPTIONS = ["70 مل", "100 مل", "500 مل", "1000 مل"] as const;

const INK_NAME_CAPACITY_PATTERN = /\d+\s*(?:مل|ml)(?![A-Za-z\u0600-\u06ff])/giu;
const INK_NAME_MARKETING_PATTERN = /(?:^|\s)(?:أفضل|ممتاز|احترافي|بريميوم|premium|professional)(?:\s|$)/iu;

function normalizeCapacityLabel(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.match(/^(\d+)\s*(?:مل|ml)$/iu)?.[1] ?? normalized.toLocaleLowerCase("en");
}

export function getInkProductNameError(name: string, capacities: string[]) {
  const normalizedName = name.trim().replace(/\s+/g, " ");
  if (!normalizedName.startsWith("حبر ")) return "يجب أن يبدأ اسم منتج الحبر بكلمة «حبر» بصيغة المفرد.";
  if (normalizedName.length > 80) return "اسم منتج الحبر طويل. استخدم الاسم الفني والسعة فقط.";
  if (INK_NAME_MARKETING_PATTERN.test(normalizedName)) return "لا تُضف كلمات تسويقية إلى اسم منتج الحبر.";

  const selectedCapacities = [...new Set(capacities.map(normalizeCapacityLabel).filter(Boolean))].sort();
  if (!selectedCapacities.length) return "حدّد سعة واحدة على الأقل في حقل «السعات المتوفرة».";

  const namedCapacities = [...new Set((normalizedName.match(INK_NAME_CAPACITY_PATTERN) ?? []).map(normalizeCapacityLabel))].sort();
  if (namedCapacities.length !== selectedCapacities.length
    || namedCapacities.some((capacity, index) => capacity !== selectedCapacities[index])) {
    return "يجب أن يذكر الاسم جميع السعات المحددة فقط، ويمكن كتابة الوحدة بصيغة «مل» أو «ML».";
  }
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
  ].filter((row): row is SpecificationDisplayRow => Boolean(row));
}
