import type { SpecificationDisplayRow } from "./printer-specifications";

export type InkSpecifications = {
  images: string[];
  brand: string | null;
  inkType: string | null;
  color: string | null;
  capacities: string[];
  compatiblePrinters: string[];
  features: string[];
  uses: string[];
};

export const INK_TYPE_OPTIONS = ["Dye", "Pigment", "Sublimation", "Eco-Solvent", "UV Ink", "أخرى"] as const;
export const INK_COLOR_OPTIONS = ["أسود", "سماوي", "أرجواني", "أصفر", "سماوي فاتح", "أرجواني فاتح", "أخرى"] as const;
export const INK_CAPACITY_OPTIONS = ["70 مل", "100 مل", "500 مل", "1000 مل"] as const;

export function createEmptyInkSpecifications(): InkSpecifications {
  return { images: [], brand: null, inkType: null, color: null, capacities: [], compatiblePrinters: [], features: [], uses: [] };
}

function textOrNull(value: unknown, maxLength = 160) {
  const text = typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  return text || null;
}

function stringList(value: unknown, maxItems = 30) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(String).map((item) => item.trim().slice(0, 180)).filter(Boolean))].slice(0, maxItems);
}

export function normalizeInkSpecifications(value: unknown): InkSpecifications | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const input = value as Record<string, unknown>;
  if (!["images", "brand", "inkType", "color", "capacities", "compatiblePrinters", "features", "uses"].some((key) => Object.hasOwn(input, key))) return undefined;
  return {
    images: stringList(input.images, 50),
    brand: textOrNull(input.brand, 120),
    inkType: textOrNull(input.inkType, 80),
    color: textOrNull(input.color, 80),
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
  return [specifications.brand, specifications.inkType, specifications.color, ...specifications.capacities]
    .filter((value): value is string => Boolean(value))
    .slice(0, 4);
}

export function buildInkSpecificationRows(product: InkDisplayInput): SpecificationDisplayRow[] {
  const specifications = product.inkSpecifications;
  if (!specifications) return [];
  return [
    specifications.brand ? { key: "brand", label: "العلامة التجارية", value: specifications.brand } : null,
    specifications.inkType ? { key: "ink-type", label: "نوع الحبر", value: specifications.inkType } : null,
    specifications.color ? { key: "color", label: "اللون", value: specifications.color } : null,
    specifications.capacities.length ? { key: "capacities", label: "السعات المتوفرة", value: specifications.capacities.join("، ") } : null,
    specifications.compatiblePrinters.length ? { key: "compatible-printers", label: "الطابعات المتوافقة", value: specifications.compatiblePrinters.join("، ") } : null,
  ].filter((row): row is SpecificationDisplayRow => Boolean(row));
}
