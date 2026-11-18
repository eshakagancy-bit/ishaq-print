import { cache } from "react";
import { getInkSlug } from "../app/inks/product-slug";
import { getPaperSlug } from "../app/papers/product-slug";
import { getPrinterSlug } from "../app/printers/product-slug";
import { isInkCategory } from "../app/laser-inks";
import { getProductById } from "./site-database";

const slugFor = { printers: getPrinterSlug, papers: getPaperSlug, inks: getInkSlug };

// Canonical URLs use the ID prefix, but the full slug and category still have
// to match. React memoizes the result only for the current server request.
export const getProductDetails = cache(async (section: keyof typeof slugFor, slug: string) => {
  const prefix = /^([1-9]\d*)-/.exec(slug)?.[1];
  const id = Number(prefix);
  if (!Number.isSafeInteger(id)) return null;
  const product = await getProductById(id);
  if (!product || (section === "inks" ? !isInkCategory(product.category) : product.category !== section)) return null;
  return slugFor[section](product) === slug ? product : null;
});
