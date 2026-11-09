import type { StoredProduct } from "./site-defaults";
import { getProductDetailsHref as coreGetProductDetailsHref } from "./product-details-href-core.js";

export type ProductLinkTarget = Pick<StoredProduct, "id" | "name" | "category"> & {
  slug?: string;
};

export function getProductDetailsHref(product: ProductLinkTarget): string {
  return coreGetProductDetailsHref(product);
}
