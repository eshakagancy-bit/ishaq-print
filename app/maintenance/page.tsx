import type { Metadata } from "next";
import { getHomeData } from "../../lib/site-database";
import HomeClient from "../home-client";
import { isPublicCategoryEnabled } from "../public-categories";
import { publicMetadata } from "../seo";
import {
  defaultHeroSettings,
  defaultHeroSlides,
  defaultSiteSettings,
  starterProducts,
} from "../site-defaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = publicMetadata({
  title: "الصيانة والدعم الفني | وكالة إسحاق العالمية",
  description: "تواصل مع قسم الصيانة والدعم الفني للاستفسار عن الفحص والصيانة ومتابعة الخدمة عبر أرقام الصيانة المعتمدة.",
  path: "/maintenance",
});

export default async function MaintenancePage() {
  const siteData = await getHomeData().catch(() => ({
    settings: defaultSiteSettings,
    products: starterProducts,
  }));

  return <HomeClient
    initialSettings={siteData.settings}
    initialProducts={siteData.products.filter((product) => isPublicCategoryEnabled(product.category))}
    initialHeroSlides={defaultHeroSlides}
    initialHeroSettings={defaultHeroSettings}
    initialPage="maintenance"
  />;
}
