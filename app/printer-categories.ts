export const PRINTER_CATEGORIES = [
  {
    value: "workforce",
    label: "WorkForce (طابعات الأعمال الشاقة)",
  },
  {
    value: "ecotank",
    label: "EcoTank (طابعات مكتبية وشخصية)",
  },
  {
    value: "ecotank-6-color",
    label: "EcoTank 6 Color (طابعات الفوتوجرافي)",
  },
  {
    value: "lq",
    label: "LQ (طابعات الفواتير والسندات)",
  },
] as const;

export const ALL_PRINTERS_FILTER = {
  value: "all",
  label: "الكل",
} as const;

export type PrinterCategory = typeof PRINTER_CATEGORIES[number]["value"];
export type PrinterCategoryFilter = typeof ALL_PRINTERS_FILTER["value"] | PrinterCategory;

export const HOME_PRINTER_LABELS: Record<PrinterCategory, string> = {
  workforce: "WorkForce (طابعات الأعمال الشاقة)",
  ecotank: "EcoTank (الطابعات المكتبية)",
  "ecotank-6-color": "EcoTank 6 Color (طابعات التصوير الفوتوغرافي)",
  lq: "LQ (طابعات الفواتير والسندات)",
};

export function isPrinterCategory(value: unknown): value is PrinterCategory {
  return typeof value === "string" && PRINTER_CATEGORIES.some((category) => category.value === value);
}

export function inferPrinterCategory(productName: string): PrinterCategory | undefined {
  return /^Epson\s+WorkForce(?:\s|$)/i.test(productName.trim()) ? "workforce" : undefined;
}

export function resolvePrinterCategory(value: unknown, productName: string): PrinterCategory | undefined {
  return isPrinterCategory(value) ? value : inferPrinterCategory(productName);
}

export function getPrinterCategoryLabel(value: unknown) {
  return PRINTER_CATEGORIES.find((category) => category.value === value)?.label;
}
