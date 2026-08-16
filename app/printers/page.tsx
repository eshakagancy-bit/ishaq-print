import { notFound } from "next/navigation";
import { getSiteData } from "../../lib/site-database";
import CategoryProductsClient from "../category-products-client";
import { isPublicCategoryEnabled } from "../public-categories";
import { defaultSiteSettings, starterProducts } from "../site-defaults";
import { publicMetadata } from "../seo";

export const metadata = publicMetadata({
  title: "الطابعات | وكالة إسحاق العالمية",
  description: "تصفح الطابعات المتاحة لدى وكالة إسحاق العالمية واختر ما يناسب احتياجات العمل والطباعة.",
  path: "/printers",
});

export const dynamic = "force-dynamic";
export default async function PrintersPage() {
  if (!isPublicCategoryEnabled("printers")) notFound();
  const data = await getSiteData().catch(() => ({ products: starterProducts, settings: defaultSiteSettings }));
  return <CategoryProductsClient category="printers" products={data.products.filter((product) => product.category === "printers")} allProducts={data.products} settings={data.settings} />;
}
