import type { ProductModel, StoredProduct } from "./site-defaults";

export const PRODUCT_MODEL_AVAILABILITY_LABELS: Record<ProductModel["availability"], string> = {
  in_stock: "متوفر",
  out_of_stock: "غير متوفر",
  on_request: "حسب الطلب",
};

export function activeProductModels(product: Pick<StoredProduct, "models">) {
  return (product.models ?? [])
    .filter((model) => model.isActive)
    .toSorted((a, b) => a.sortOrder - b.sortOrder || a.model.localeCompare(b.model));
}

export function productModelHref(href: string, model: ProductModel) {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}model=${encodeURIComponent(model.model)}`;
}

export function selectProductModel(models: ProductModel[], requestedModel?: string) {
  const activeModels = models.filter((model) => model.isActive).toSorted((a, b) => a.sortOrder - b.sortOrder || a.model.localeCompare(b.model));
  if (!activeModels.length) return undefined;
  const normalizedRequested = requestedModel?.trim().toLocaleLowerCase();
  return activeModels.find((model) => model.model.toLocaleLowerCase() === normalizedRequested) ?? activeModels[0];
}
