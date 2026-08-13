import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { applyDefaultHeroCategoriesCta } from "../app/hero-cta.ts";

const baseSlide = {
  id: 3,
  title: "الحلول التقنية",
  subtitle: "حلول متكاملة",
  description: "وصف",
  badgeText: "تقنيات",
  imageUrl: "/hero/technology-solutions.webp",
  imageAlt: "حلول تقنية",
  primaryButtonText: "تصفح الأقسام",
  primaryButtonUrl: "/categories",
  secondaryButtonText: "واتساب",
  secondaryButtonUrl: "whatsapp",
  displayOrder: 3,
  isActive: true,
};

test("live technology slide falls back to the approved categories CTA only", () => {
  const liveSlide = {
    ...baseSlide,
    title: "نص حي من Supabase",
    imageUrl: "/api/media/banners/live.webp",
    primaryButtonText: "تصفح الأقسام",
    primaryButtonUrl: "#categories",
  };

  const resolved = applyDefaultHeroCategoriesCta(liveSlide, [baseSlide]);
  assert.equal(resolved.primaryButtonText, "تصفح الأقسام");
  assert.equal(resolved.primaryButtonUrl, "/categories");
  assert.equal(resolved.title, liveSlide.title);
  assert.equal(resolved.imageUrl, liveSlide.imageUrl);
  const otherSlide = { ...baseSlide, id: 1, primaryButtonUrl: "#products" };
  assert.equal(applyDefaultHeroCategoriesCta(otherSlide, [baseSlide]), otherSlide);
});

test("hero renders one keyboard-focusable CTA only for the active slide", async () => {
  const home = await readFile(new URL("../app/home-client.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(home, /index === activeHeroSlide && slide\.primaryButtonText\.trim\(\)/);
  assert.match(home, /<Link className="hero-slide-cta" href=\{slide\.primaryButtonUrl\}>\{slide\.primaryButtonText\}<\/Link>/);
  assert.equal(home.match(/className="hero-slide-cta"/g)?.length, 1);
  assert.match(home, /heroSettings\.autoplayEnabled/);
  assert.match(home, /prefers-reduced-motion: reduce/);
  assert.match(page, /applyDefaultHeroCategoriesCta\(slide, defaultHeroSlides\)/);
});
