import { notFound } from "next/navigation";
import { getSiteData } from "../../lib/site-database";
import CategoryProductsClient from "../category-products-client";
import { isPublicCategoryEnabled } from "../public-categories";
import { defaultSiteSettings, starterProducts } from "../site-defaults";
import { publicMetadata } from "../seo";
import { isInkCategory } from "../laser-inks";

export const metadata = publicMetadata({
  title: "الأحبار | وكالة إسحاق العالمية",
  description: "تصفح الأحبار المتاحة لدى وكالة إسحاق العالمية لمختلف الطابعات واحتياجات الطباعة.",
  path: "/inks",
});

export const dynamic = "force-dynamic";
export default async function InksPage() {
  if (!isPublicCategoryEnabled("inks")) notFound();
  const data = await getSiteData().catch(() => ({ products: starterProducts, settings: defaultSiteSettings }));
  return <CategoryProductsClient category="inks" products={data.products.filter((product) => isInkCategory(product.category))} allProducts={data.products} settings={data.settings} />;
}
