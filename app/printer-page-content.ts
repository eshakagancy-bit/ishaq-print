export type ProductContentItem = {
  title: string;
  description: string;
};

export type ProductFaqItem = {
  question: string;
  answer: string;
};

export type PrinterPageContent = {
  detailedDescription: string;
  productFeatures: ProductContentItem[];
  productUses: ProductContentItem[];
  whyChooseThisProduct: string;
  faq: ProductFaqItem[];
};

export function createEmptyPrinterPageContent(): PrinterPageContent {
  return {
    detailedDescription: "",
    productFeatures: [],
    productUses: [],
    whyChooseThisProduct: "",
    faq: [],
  };
}

function normalizeText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function normalizeContentItems(value: unknown): ProductContentItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 50)
    .map((item) => {
      const input = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        title: normalizeText(input.title, 200),
        description: normalizeText(input.description, 4000),
      };
    })
    .filter((item) => item.title || item.description);
}

function normalizeFaqItems(value: unknown): ProductFaqItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 50)
    .map((item) => {
      const input = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        question: normalizeText(input.question, 500),
        answer: normalizeText(input.answer, 5000),
      };
    })
    .filter((item) => item.question || item.answer);
}

export function normalizePrinterPageContent(value: unknown): PrinterPageContent {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    detailedDescription: normalizeText(input.detailedDescription, 20000),
    productFeatures: normalizeContentItems(input.productFeatures),
    productUses: normalizeContentItems(input.productUses),
    whyChooseThisProduct: normalizeText(input.whyChooseThisProduct, 20000),
    faq: normalizeFaqItems(input.faq),
  };
}

export function hasPrinterPageContent(value: PrinterPageContent) {
  return Boolean(
    value.detailedDescription
    || value.productFeatures.length
    || value.productUses.length
    || value.whyChooseThisProduct
    || value.faq.length,
  );
}
