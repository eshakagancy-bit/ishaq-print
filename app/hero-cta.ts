import type { HeroSlide } from "./site-defaults";

export function applyDefaultHeroCategoriesCta(
  slide: HeroSlide,
  defaults: readonly HeroSlide[],
): HeroSlide {
  const fallback = defaults.find((item) =>
    item.id === slide.id && item.primaryButtonUrl === "/categories"
  );
  if (!fallback) return slide;

  const primaryButtonText = typeof slide.primaryButtonText === "string" ? slide.primaryButtonText.trim() : "";
  const primaryButtonUrl = typeof slide.primaryButtonUrl === "string" ? slide.primaryButtonUrl.trim() : "";
  if (primaryButtonText && primaryButtonUrl && primaryButtonUrl !== "#categories") return slide;

  return {
    ...slide,
    primaryButtonText: fallback.primaryButtonText,
    primaryButtonUrl: fallback.primaryButtonUrl,
  };
}
