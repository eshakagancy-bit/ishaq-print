import { notFound } from "next/navigation";
import { getSiteData } from "../../lib/site-database";
import CategoryProductsClient from "../category-products-client";
import { isPublicCategoryEnabled } from "../public-categories";
import { starterProducts } from "../site-defaults";

export const dynamic = "force-dynamic";
export default async function InksPage() {
  if (!isPublicCategoryEnabled("inks")) notFound();
  const data = await getSiteData().catch(() => ({ products: starterProducts }));
  return <CategoryProductsClient category="inks" products={data.products.filter((product) => product.category === "inks")} />;
}
