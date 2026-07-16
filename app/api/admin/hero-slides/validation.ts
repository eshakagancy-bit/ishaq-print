import { defaultHeroSettings, type HeroSettings } from "../../../site-defaults";

export type HeroSlideInput = {
  title: string;
  subtitle: string;
  description: string;
  badgeText: string;
  imageUrl: string;
  imageAlt: string;
  primaryButtonText: string;
  primaryButtonUrl: string;
  secondaryButtonText: string;
  secondaryButtonUrl: string;
  displayOrder: number;
  isActive: boolean;
};

function text(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function booleanValue(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

function validLink(value: string) {
  if (!value) return true;
  if (value === "whatsapp") return true;
  if (value.startsWith("#") || value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validImage(value: string) {
  if (!value) return false;
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeHeroSlideInput(value: unknown): HeroSlideInput {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const slide = {
    title: text(input.title, 180),
    subtitle: text(input.subtitle, 120),
    description: text(input.description, 900),
    badgeText: text(input.badgeText ?? input.badge_text, 120),
    imageUrl: text(input.imageUrl ?? input.image_url, 1000),
    imageAlt: text(input.imageAlt ?? input.image_alt, 220),
    primaryButtonText: text(input.primaryButtonText ?? input.primary_button_text, 120),
    primaryButtonUrl: text(input.primaryButtonUrl ?? input.primary_button_url, 1000),
    secondaryButtonText: text(input.secondaryButtonText ?? input.secondary_button_text, 120),
    secondaryButtonUrl: text(input.secondaryButtonUrl ?? input.secondary_button_url, 1000),
    displayOrder: Number.isFinite(Number(input.displayOrder ?? input.display_order)) ? Math.trunc(Number(input.displayOrder ?? input.display_order)) : 0,
    isActive: booleanValue(input.isActive ?? input.is_active, true),
  };

  if (!slide.title) throw new Error("عنوان الشريحة مطلوب");
  if (!slide.description) throw new Error("وصف الشريحة مطلوب");
  if (!validImage(slide.imageUrl)) throw new Error("رابط الصورة غير صالح");
  if (!validLink(slide.primaryButtonUrl)) throw new Error("رابط الزر الأول غير صالح");
  if (!validLink(slide.secondaryButtonUrl)) throw new Error("رابط الزر الثاني غير صالح");

  return slide;
}

export function normalizeHeroSettingsInput(value: unknown): HeroSettings {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const delaySeconds = Number(input.autoplayDelaySeconds);
  const delay = Number.isFinite(Number(input.autoplayDelay))
    ? Number(input.autoplayDelay)
    : Number.isFinite(delaySeconds)
      ? delaySeconds * 1000
      : defaultHeroSettings.autoplayDelay;

  return {
    autoplayEnabled: booleanValue(input.autoplayEnabled, defaultHeroSettings.autoplayEnabled),
    autoplayDelay: Math.min(30000, Math.max(1000, Math.trunc(delay))),
    showArrows: booleanValue(input.showArrows, defaultHeroSettings.showArrows),
    showDots: booleanValue(input.showDots, defaultHeroSettings.showDots),
    pauseOnHover: booleanValue(input.pauseOnHover, defaultHeroSettings.pauseOnHover),
  };
}
