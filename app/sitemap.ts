import type { MetadataRoute } from "next";
import { getSitemapProducts } from "../lib/site-database";
import { getInkSlug } from "./inks/product-slug";
import { getPaperSlug } from "./papers/product-slug";
import { getPrinterSlug } from "./printers/product-slug";
import { isPublicCategoryEnabled } from "./public-categories";
import { SITE_URL } from "./seo";
import { starterProducts } from "./site-defaults";
import { isInkCategory } from "./laser-inks";

const publicPages = ["", "/categories", "/printers", "/papers", "/inks", "/laser-inks", "/maintenance"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getSitemapProducts().catch(() => starterProducts.map((product) => ({
    ...product,
    updatedAt: undefined,
  })));
  const productPages = products
    .filter((product) => isPublicCategoryEnabled(product.category) || isInkCategory(product.category))
    .map((product) => {
      const slug = product.category === "printers"
        ? getPrinterSlug(product)
        : product.category === "papers"
          ? getPaperSlug(product)
          : getInkSlug(product);
      return {
        url: `${SITE_URL}/${isInkCategory(product.category) ? "inks" : product.category}/${slug}`,
        lastModified: product.updatedAt,
      };
    });

  return [
    ...publicPages.map((path, index) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: "weekly" as const,
      priority: index === 0 ? 1 : 0.8,
    })),
    ...productPages.map((productPage) => ({
      url: productPage.url,
      ...(productPage.lastModified ? { lastModified: productPage.lastModified } : {}),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
