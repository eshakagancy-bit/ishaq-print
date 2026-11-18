import { notFound } from "next/navigation";
import { getCategoryData } from "../../lib/site-database";
import CategoryProductsClient from "../category-products-client";
import { isPublicCategoryEnabled } from "../public-categories";
import { publicMetadata } from "../seo";

export const metadata = publicMetadata({
  title: "الطابعات | وكالة إسحاق العالمية",
  description: "تصفح الطابعات المتاحة لدى وكالة إسحاق العالمية واختر ما يناسب احتياجات العمل والطباعة.",
  path: "/printers",
});

export const dynamic = "force-dynamic";
export default async function PrintersPage() {
  if (!isPublicCategoryEnabled("printers")) notFound();
  const data = await getCategoryData("printers");
  return <CategoryProductsClient category="printers" products={data.products} settings={data.settings} />;
}
