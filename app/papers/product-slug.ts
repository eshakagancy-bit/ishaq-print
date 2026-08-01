import type { StoredProduct } from "../site-defaults";

export function getPaperSlug(product: Pick<StoredProduct, "id" | "name"> & { slug?: string }) {
  const existingSlug = product.slug?.trim();
  if (existingSlug) return existingSlug;
  const name = product.name
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${product.id}-${name || "paper"}`;
}
