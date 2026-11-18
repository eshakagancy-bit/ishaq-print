import { notFound } from "next/navigation";
import { getCategoryData } from "../../lib/site-database";
import CategoryProductsClient from "../category-products-client";
import { isPublicCategoryEnabled } from "../public-categories";
import { publicMetadata } from "../seo";

export const metadata = publicMetadata({
  title: "الأحبار | وكالة إسحاق العالمية",
  description: "تصفح الأحبار المتاحة لدى وكالة إسحاق العالمية لمختلف الطابعات واحتياجات الطباعة.",
  path: "/inks",
});

export const dynamic = "force-dynamic";
export default async function InksPage() {
  if (!isPublicCategoryEnabled("inks")) notFound();
  const data = await getCategoryData("inks");
  return <CategoryProductsClient category="inks" products={data.products} settings={data.settings} />;
}
