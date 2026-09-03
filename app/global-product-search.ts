import { isInkCategory } from "./laser-inks-core.js";
import type { ProductModel, ProductModelVariant } from "./site-defaults";

export type ProductSearchScope = "all" | "printers" | "inks" | "papers";

type SearchableProduct = {
  id: number;
  category: string;
};

type ModelSearchableProduct = SearchableProduct & {
  models?: ProductModel[];
};

export type ProductSearchMatchKind =
  | "model"
  | "model-part-number"
  | "variant-part-number"
  | "variant-color"
  | "compatibility";

export type ProductModelSearchMatch = {
  model: ProductModel;
  kinds: ProductSearchMatchKind[];
  variants: ProductModelVariant[];
};

export type ProductSearchResult<T> = {
  product: T;
  matchedModels: ProductModelSearchMatch[];
  rank: number;
};

const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const WORD_SEPARATORS = /[-_\u2013\u2014/\\]+/g;

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

function compactSearchText(value: string) {
  return normalizeProductSearchText(value).replace(/\s+/g, "");
}

function matchesSearchText(value: string | null | undefined, normalizedQuery: string) {
  if (!value) return false;
  const normalizedValue = normalizeProductSearchText(value);
  if (!normalizedValue) return false;
  const compactQuery = compactSearchText(normalizedQuery);
  if (/^\d{2,3}[a-z]$/i.test(compactQuery)) {
    return normalizedValue.split(" ").some((token) => token === compactQuery || compactSearchText(token) === `hp${compactQuery}`);
  }
  const queryTokens = normalizedQuery.split(" ");
  if (queryTokens.every((token) => normalizedValue.includes(token))) return true;
  return compactSearchText(normalizedValue).includes(compactQuery);
}

function isExactCodeMatch(value: string | null | undefined, normalizedQuery: string) {
  if (!value) return false;
  const candidate = compactSearchText(value);
  const query = compactSearchText(normalizedQuery);
  return candidate === query || candidate === `hp${query}` || query === `hp${candidate}`;
}

function productIsInScope(product: SearchableProduct, scope: ProductSearchScope) {
  return scope === "all" || (scope === "inks" ? isInkCategory(product.category) : product.category === scope);
}

export function searchProducts<T extends SearchableProduct>(
  products: T[],
  query: string,
  scope: ProductSearchScope,
  getSearchValues: (product: T) => Array<string | null | undefined>,
) {
  const normalizedQuery = normalizeProductSearchText(query);
  if (!normalizedQuery) return [];

  return products.filter((product) => {
    if (!productIsInScope(product, scope)) return false;
    const haystack = getSearchValues(product).filter(Boolean).join(" ");
    return matchesSearchText(haystack, normalizedQuery);
  });
}

export function searchProductResults<T extends ModelSearchableProduct>(
  products: T[],
  query: string,
  scope: ProductSearchScope,
  getProductSearchValues: (product: T) => Array<string | null | undefined>,
): ProductSearchResult<T>[] {
  const normalizedQuery = normalizeProductSearchText(query);
  if (!normalizedQuery) return [];

  return products.flatMap((product, productIndex) => {
    if (!productIsInScope(product, scope)) return [];

    let rank = Number.POSITIVE_INFINITY;
    const productValues = getProductSearchValues(product).filter(Boolean) as string[];
    if (matchesSearchText(productValues.join(" "), normalizedQuery)) rank = 3;

    const matchedModels = (product.models ?? [])
      .filter((model) => model.isActive)
      .flatMap((model): ProductModelSearchMatch[] => {
        const kinds: ProductSearchMatchKind[] = [];
        const activeVariants = (model.variants ?? []).filter((variant) => variant.isActive);
        const modelNameMatches = matchesSearchText(model.model, normalizedQuery);
        const variantPartMatches = activeVariants.filter((variant) => matchesSearchText(variant.partNumber, normalizedQuery));
        const exactVariantPartMatches = variantPartMatches.filter((variant) => isExactCodeMatch(variant.partNumber, normalizedQuery));
        const variantColorMatches = activeVariants.filter((variant) => matchesSearchText(variant.color, normalizedQuery));
        const variants = exactVariantPartMatches.length
          ? exactVariantPartMatches
          : modelNameMatches
            ? variantColorMatches
            : [...new Map([...variantPartMatches, ...variantColorMatches].map((variant) => [variant.id ?? variant.color, variant])).values()];

        if (modelNameMatches) {
          kinds.push("model");
          rank = Math.min(rank, isExactCodeMatch(model.model, normalizedQuery) ? 0 : 5);
        }
        if (matchesSearchText(model.partNumber, normalizedQuery)) {
          kinds.push("model-part-number");
          rank = Math.min(rank, isExactCodeMatch(model.partNumber, normalizedQuery) ? 1 : 5);
        }
        if (matchesSearchText(model.compatibility, normalizedQuery)) {
          kinds.push("compatibility");
          rank = Math.min(rank, 4);
        }
        if (variantPartMatches.length) {
          kinds.push("variant-part-number");
          rank = Math.min(rank, exactVariantPartMatches.length ? 2 : 5);
        }
        if (variantColorMatches.length) {
          kinds.push("variant-color");
          rank = Math.min(rank, 5);
        }

        if (!kinds.length) return [];
        return [{ model, kinds, variants }];
      });

    if (!Number.isFinite(rank)) return [];
    return [{ product, matchedModels, rank, productIndex }];
  })
    .toSorted((left, right) => left.rank - right.rank || left.productIndex - right.productIndex)
    .map(({ product, matchedModels, rank }) => ({ product, matchedModels, rank }));
}

export function productSearchMatchHref(
  productHref: string,
  model: Pick<ProductModel, "model">,
  variant?: Pick<ProductModelVariant, "color">,
) {
  const parameters = new URLSearchParams({ model: model.model });
  if (variant) parameters.set("color", variant.color);
  return `${productHref}?${parameters.toString()}`;
}
