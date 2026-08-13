import type { HeroSettings } from "../../../site-defaults";
import { DEFAULT_SUPABASE_STORAGE_BUCKET, normalizeMediaUrl } from "../../../../lib/media-url";
import {
  AdminValidationError,
  optionalString,
  requiredString,
  safeWebOrLocalUrl,
  strictBoolean,
  strictObject,
} from "../../admin-validation";

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

const slideKeys = ["id", "title", "subtitle", "description", "badgeText", "badge_text", "imageUrl", "image_url", "imageAlt", "image_alt", "primaryButtonText", "primary_button_text", "primaryButtonUrl", "primary_button_url", "secondaryButtonText", "secondary_button_text", "secondaryButtonUrl", "secondary_button_url", "displayOrder", "display_order", "isActive", "is_active"];
const settingsKeys = ["autoplayEnabled", "autoplayDelay", "autoplayDelaySeconds", "showArrows", "showDots", "pauseOnHover"];

function aliased(input: Record<string, unknown>, camel: string, snake: string) {
  if (input[camel] !== undefined && input[snake] !== undefined) throw new AdminValidationError(`لا ترسل الحقلين ${camel} و${snake} معًا`);
  return input[camel] ?? input[snake];
}

function validHeroLink(value: string, label: string) {
  if (!value || value === "whatsapp" || value.startsWith("#")) return;
  safeWebOrLocalUrl(value, label, 1000);
}

export function normalizeHeroSlideInput(value: unknown, expectedId?: number | "create"): HeroSlideInput {
  const input = strictObject(value, slideKeys, "بيانات الشريحة");
  if (input.id !== undefined) {
    if (!Number.isSafeInteger(input.id) || Number(input.id) < 0) throw new AdminValidationError("معرّف الشريحة غير صالح");
    if (expectedId === "create" && input.id !== 0) throw new AdminValidationError("لا يمكن تعيين معرّف شريحة جديدة");
    if (typeof expectedId === "number" && input.id !== expectedId) throw new AdminValidationError("معرّف الشريحة لا يطابق المسار");
  }

  const title = requiredString(input.title, "عنوان الشريحة", 180);
  const description = requiredString(input.description, "وصف الشريحة", 900);
  const imageUrlValue = aliased(input, "imageUrl", "image_url");
  const imageUrl = requiredString(imageUrlValue, "صورة الشريحة", 1000);
  safeWebOrLocalUrl(imageUrl, "صورة الشريحة", 1000, false);

  const stringFields = [
    ["subtitle", "subtitle", 120], ["badgeText", "badge_text", 120], ["imageAlt", "image_alt", 220],
    ["primaryButtonText", "primary_button_text", 120], ["primaryButtonUrl", "primary_button_url", 1000],
    ["secondaryButtonText", "secondary_button_text", 120], ["secondaryButtonUrl", "secondary_button_url", 1000],
  ] as const;
  const strings = Object.fromEntries(stringFields.map(([camel, snake, max]) => {
    const field = aliased(input, camel, snake);
    optionalString(field, camel, max);
    return [camel, typeof field === "string" ? field.trim() : ""];
  })) as Record<string, string>;
  validHeroLink(strings.primaryButtonUrl, "رابط الزر الأول");
  validHeroLink(strings.secondaryButtonUrl, "رابط الزر الثاني");

  const displayOrder = aliased(input, "displayOrder", "display_order");
  if (!Number.isSafeInteger(displayOrder) || Number(displayOrder) < 0) throw new AdminValidationError("ترتيب الشريحة غير صالح");
  const isActive = aliased(input, "isActive", "is_active");
  strictBoolean(isActive, "حالة الشريحة");

  return {
    title,
    subtitle: strings.subtitle,
    description,
    badgeText: strings.badgeText,
    imageUrl: normalizeMediaUrl(imageUrl, process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_SUPABASE_STORAGE_BUCKET),
    imageAlt: strings.imageAlt,
    primaryButtonText: strings.primaryButtonText,
    primaryButtonUrl: strings.primaryButtonUrl,
    secondaryButtonText: strings.secondaryButtonText,
    secondaryButtonUrl: strings.secondaryButtonUrl,
    displayOrder: displayOrder as number,
    isActive: isActive as boolean,
  };
}

export function normalizeHeroSettingsInput(value: unknown): HeroSettings {
  const input = strictObject(value, settingsKeys, "إعدادات البانر");
  ["autoplayEnabled", "showArrows", "showDots", "pauseOnHover"].forEach((key) => strictBoolean(input[key], key));
  if (input.autoplayDelay !== undefined && input.autoplayDelaySeconds !== undefined) throw new AdminValidationError("استخدم وحدة واحدة فقط لمدة التشغيل التلقائي");
  const delay = input.autoplayDelay !== undefined ? input.autoplayDelay : Number(input.autoplayDelaySeconds) * 1000;
  if (typeof delay !== "number" || !Number.isSafeInteger(delay) || delay < 1000 || delay > 30000) throw new AdminValidationError("مدة التشغيل التلقائي غير صالحة");
  return {
    autoplayEnabled: input.autoplayEnabled as boolean,
    autoplayDelay: delay,
    showArrows: input.showArrows as boolean,
    showDots: input.showDots as boolean,
    pauseOnHover: input.pauseOnHover as boolean,
  };
}
