import { isInkCategory } from "./laser-inks-core.js";

export function slugifyProductName(name, fallback) {
  const normalized = String(name || "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

export function getProductDetailsHref(product) {
  if (isInkCategory(product.category)) {
    return `/inks/${product.id}-${slugifyProductName(product.name, "ink")}`;
  }
  if (product.category === "papers") {
    const slug = product.slug?.trim();
    if (slug) return `/papers/${slug}`;
    return `/papers/${product.id}-${slugifyProductName(product.name, "paper")}`;
  }
  return `/printers/${product.id}-${slugifyProductName(product.name, "printer")}`;
}
