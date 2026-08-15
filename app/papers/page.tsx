import { notFound } from "next/navigation";
import { getSiteData } from "../../lib/site-database";
import CategoryProductsClient from "../category-products-client";
import { isPublicCategoryEnabled } from "../public-categories";
import { defaultSiteSettings, starterProducts } from "../site-defaults";
import { publicMetadata } from "../seo";

export const metadata = publicMetadata({
  title: "الأوراق | وكالة إسحاق العالمية",
  description: "تصفح الأوراق المتخصصة المتاحة لدى وكالة إسحاق العالمية لمختلف احتياجات الطباعة.",
  path: "/papers",
});

export const dynamic = "force-dynamic";
export default async function PapersPage() {
  if (!isPublicCategoryEnabled("papers")) notFound();
  const data = await getSiteData().catch(() => ({ products: starterProducts, settings: defaultSiteSettings }));
  return <CategoryProductsClient category="papers" products={data.products.filter((product) => product.category === "papers")} settings={data.settings} />;
}
