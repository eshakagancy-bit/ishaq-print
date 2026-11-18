import { notFound } from "next/navigation";
import { getCategoryData } from "../../lib/site-database";
import CategoryProductsClient from "../category-products-client";
import { isPublicCategoryEnabled } from "../public-categories";
import { publicMetadata } from "../seo";

export const metadata = publicMetadata({
  title: "أحبار الليزر | وكالة إسحاق العالمية",
  description: "تصفح أحبار الليزر المتاحة لدى وكالة إسحاق العالمية لمختلف موديلات الطابعات.",
  path: "/laser-inks",
});

export const dynamic = "force-dynamic";

export default async function LaserInksPage() {
  if (!isPublicCategoryEnabled("laser_inks")) notFound();
  const data = await getCategoryData("laser_inks");
  return <CategoryProductsClient category="laser_inks" products={data.products} settings={data.settings} />;
}
