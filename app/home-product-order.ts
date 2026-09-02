import type { StoredProduct } from "./site-defaults";
import { isInkCategory } from "./laser-inks-core.js";

export const HOME_PRODUCT_CATEGORIES = ["printers", "papers", "inks"] as const;

export type HomeProductCategory = typeof HOME_PRODUCT_CATEGORIES[number];

export type HomeProductOrderItem = {
  id: number;
  category: string;
  homeDisplayOrder: number;
};

export function isHomeProductCategory(value: string): value is HomeProductCategory {
  return HOME_PRODUCT_CATEGORIES.includes(value as HomeProductCategory);
}

function validOrder(value: number | undefined) {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

export function compareHomeProductOrder(left: StoredProduct, right: StoredProduct) {
  const leftHomeOrder = validOrder(left.homeDisplayOrder);
  const rightHomeOrder = validOrder(right.homeDisplayOrder);

  if (leftHomeOrder !== null || rightHomeOrder !== null) {
    if (leftHomeOrder === null) return 1;
    if (rightHomeOrder === null) return -1;
    if (leftHomeOrder !== rightHomeOrder) return leftHomeOrder - rightHomeOrder;
  }

  const leftFallback = validOrder(left.sortOrder) ?? Number.MAX_SAFE_INTEGER;
  const rightFallback = validOrder(right.sortOrder) ?? Number.MAX_SAFE_INTEGER;
  return leftFallback - rightFallback || left.id - right.id;
}

export function homeProductsForCategory(products: StoredProduct[], category: HomeProductCategory) {
  return products.filter((product) => category === "inks" ? isInkCategory(product.category) : product.category === category).sort(compareHomeProductOrder);
}

export function moveHomeProduct(
  products: StoredProduct[],
  category: HomeProductCategory,
  productId: number,
  direction: -1 | 1,
) {
  const ordered = homeProductsForCategory(products, category);
  const currentIndex = ordered.findIndex((product) => product.id === productId);
  const destinationIndex = currentIndex + direction;
  if (currentIndex < 0 || destinationIndex < 0 || destinationIndex >= ordered.length) return products;

  [ordered[currentIndex], ordered[destinationIndex]] = [ordered[destinationIndex], ordered[currentIndex]];
  const orderById = new Map(ordered.map((product, index) => [product.id, index]));
  return products.map((product) => (category === "inks" ? isInkCategory(product.category) : product.category === category)
    ? { ...product, homeDisplayOrder: orderById.get(product.id) }
    : product);
}

export function buildHomeProductOrder(products: StoredProduct[]): HomeProductOrderItem[] {
  return HOME_PRODUCT_CATEGORIES.flatMap((category) => homeProductsForCategory(products, category)
    .map((product, homeDisplayOrder) => ({ id: product.id, category: product.category, homeDisplayOrder })));
}
