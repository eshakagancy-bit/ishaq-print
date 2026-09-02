import { isInkCategory } from "./laser-inks-core.js";

export type ProductSearchScope = "all" | "printers" | "inks" | "papers";

type SearchableProduct = {
  id: number;
  category: string;
};

const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const WORD_SEPARATORS = /[-_–—/\\]+/g;

export function normalizeProductSearchText(value: string) {
  return value
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/ـ/g, "")
    .replace(WORD_SEPARATORS, " ")
    .toLocaleLowerCase("ar")
    .trim()
    .replace(/\s+/g, " ");
}

export function searchProducts<T extends SearchableProduct>(
  products: T[],
  query: string,
  scope: ProductSearchScope,
  getSearchValues: (product: T) => Array<string | null | undefined>,
) {
  const normalizedQuery = normalizeProductSearchText(query);
  if (!normalizedQuery) return [];
  const queryTokens = normalizedQuery.split(" ");

  return products.filter((product) => {
    if (scope !== "all" && (scope === "inks" ? !isInkCategory(product.category) : product.category !== scope)) return false;
    const haystack = normalizeProductSearchText(getSearchValues(product).filter(Boolean).join(" "));
    return queryTokens.every((token) => haystack.includes(token));
  });
}
