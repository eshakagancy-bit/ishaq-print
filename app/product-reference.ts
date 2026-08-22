export const PRODUCT_REFERENCE_MAX_LENGTH = 50;
export const PRODUCT_REFERENCE_DUPLICATE_MESSAGE = "الرقم المرجعي مستخدم بالفعل لمنتج آخر. اختر رقمًا مختلفًا.";

export function normalizeProductReferenceNumber(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized || undefined;
}

export function productReferenceKey(value: string | null | undefined) {
  return normalizeProductReferenceNumber(value)?.normalize("NFKC").toLocaleLowerCase("en-US");
}

export function hasDuplicateProductReference<T extends { id: number; referenceNumber?: string }>(
  products: T[],
  referenceNumber: string | null | undefined,
  excludedProductId?: number,
) {
  const key = productReferenceKey(referenceNumber);
  if (!key) return false;
  return products.some((product) => product.id !== excludedProductId && productReferenceKey(product.referenceNumber) === key);
}

export class ProductReferenceConflictError extends Error {
  constructor() {
    super(PRODUCT_REFERENCE_DUPLICATE_MESSAGE);
    this.name = "ProductReferenceConflictError";
  }
}
