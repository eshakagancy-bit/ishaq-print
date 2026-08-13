export const PRICE_ON_REQUEST_LABEL = "السعر عند الطلب";

export function productPriceLabel(price?: string | null) {
  return price?.trim() || PRICE_ON_REQUEST_LABEL;
}
