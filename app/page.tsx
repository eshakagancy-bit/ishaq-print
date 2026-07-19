import { getHeroData, getSiteData } from "../lib/site-database";
import HomeClient from "./home-client";
import {
  defaultHeroSettings,
  defaultHeroSlides,
  defaultSiteSettings,
  starterProducts,
} from "./site-defaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Home() {
  const [siteData, heroData] = await Promise.all([
    getSiteData().catch(() => ({
      settings: defaultSiteSettings,
      products: starterProducts,
    })),
    getHeroData(true).catch(() => ({
      slides: defaultHeroSlides,
      settings: defaultHeroSettings,
    })),
  ]);

  return (
    <HomeClient
      initialSettings={siteData.settings}
      initialProducts={siteData.products}
      initialHeroSlides={heroData.slides.length ? heroData.slides : defaultHeroSlides}
      initialHeroSettings={heroData.settings}
    />
  );
}
