import { getHeroData, getSiteData } from "../lib/site-database";
import HomeClient from "./home-client";
import { isPublicCategoryEnabled, isPublicCategoryUrl } from "./public-categories";
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
  const publicHeroSlides = heroData.slides.filter((slide) =>
    isPublicCategoryUrl(slide.primaryButtonUrl) && isPublicCategoryUrl(slide.secondaryButtonUrl)
  );
  const fallbackHeroSlides = defaultHeroSlides.filter((slide) =>
    isPublicCategoryUrl(slide.primaryButtonUrl) && isPublicCategoryUrl(slide.secondaryButtonUrl)
  );

  return (
    <HomeClient
      initialSettings={siteData.settings}
      initialProducts={siteData.products.filter((product) => isPublicCategoryEnabled(product.category))}
      initialHeroSlides={publicHeroSlides.length ? publicHeroSlides : fallbackHeroSlides}
      initialHeroSettings={heroData.settings}
    />
  );
}
