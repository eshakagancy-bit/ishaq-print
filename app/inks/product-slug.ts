import type { StoredProduct } from "../site-defaults";

export function getInkSlug(product: Pick<StoredProduct, "id" | "name">) {
  const name = product.name
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${product.id}-${name || "ink"}`;
}
