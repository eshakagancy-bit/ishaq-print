import { notFound } from "next/navigation";
import { getSiteData } from "../../lib/site-database";
import CategoryProductsClient from "../category-products-client";
import { isLaserInkCategory } from "../laser-inks";
import { isPublicCategoryEnabled } from "../public-categories";
import { defaultSiteSettings, starterProducts } from "../site-defaults";
import { publicMetadata } from "../seo";

export const metadata = publicMetadata({
  title: "أحبار الليزر | وكالة إسحاق العالمية",
  description: "تصفح أحبار الليزر المتاحة لدى وكالة إسحاق العالمية لمختلف موديلات الطابعات.",
  path: "/laser-inks",
});

export const dynamic = "force-dynamic";

export default async function LaserInksPage() {
  if (!isPublicCategoryEnabled("laser_inks")) notFound();
  const data = await getSiteData().catch(() => ({ products: starterProducts, settings: defaultSiteSettings }));
  return <CategoryProductsClient category="laser_inks" products={data.products.filter((product) => isLaserInkCategory(product.category))} allProducts={data.products} settings={data.settings} />;
}
