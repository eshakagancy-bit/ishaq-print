import { notFound } from "next/navigation";
import { getCategoryData } from "../../lib/site-database";
import CategoryProductsClient from "../category-products-client";
import { isPublicCategoryEnabled } from "../public-categories";
import { publicMetadata } from "../seo";

export const metadata = publicMetadata({
  title: "الأوراق | وكالة إسحاق العالمية",
  description: "تصفح الأوراق المتخصصة المتاحة لدى وكالة إسحاق العالمية لمختلف احتياجات الطباعة.",
  path: "/papers",
});

export const dynamic = "force-dynamic";
export default async function PapersPage() {
  if (!isPublicCategoryEnabled("papers")) notFound();
  const data = await getCategoryData("papers");
  return <CategoryProductsClient category="papers" products={data.products} settings={data.settings} />;
}
