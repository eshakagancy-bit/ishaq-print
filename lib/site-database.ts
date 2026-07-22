import { getSupabaseAdmin } from "./supabase-server";
import { DEFAULT_SUPABASE_STORAGE_BUCKET, normalizeMediaUrl } from "./media-url";
import { isPrinterCategory, resolvePrinterCategory } from "../app/printer-categories";
import {
  defaultHeroSettings,
  defaultHeroSlides,
  defaultSiteSettings,
  normalizeLegacyArabicText,
  normalizeProductBrandName,
  starterProducts,
  type HeroSettings,
  type HeroSlide,
  type SiteSettings,
  type StoredProduct,
} from "../app/site-defaults";

type ProductRow = {
  id: number;
  name: string;
  family: string;
  image: string;
  category: string;
  type: string;
  size: string;
  badge: string | null;
  price: string | null;
  description: string;
  features: unknown;
  sort_order: number;
};

type HeroSlideRow = {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  badge_text: string;
  image_url: string;
  image_alt: string;
  primary_button_text: string;
  primary_button_url: string;
  secondary_button_text: string;
  secondary_button_url: string;
  display_order: number;
  is_active: boolean;
};

type HeroSettingsRow = {
  id: number;
  autoplay_enabled: boolean;
  autoplay_delay: number;
  show_arrows: boolean;
  show_dots: boolean;
  pause_on_hover: boolean;
};

function databaseError(message: string, error: { message: string } | null) {
  if (error) throw new Error(`${message}: ${error.message}`);
}

function normalizeFeatures(value: unknown) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map(String).map((item) => item.trim()).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeStoredMediaUrl(value: string) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_SUPABASE_STORAGE_BUCKET;
  return normalizeMediaUrl(value, bucket);
}

function normalizeSiteSettingsMedia(settings: SiteSettings): SiteSettings {
  const normalizedText = Object.fromEntries(Object.entries(settings).map(([key, value]) => [
    key,
    typeof value === "string" ? normalizeLegacyArabicText(value) : value,
  ])) as SiteSettings;
  return {
    ...normalizedText,
    logoImage: normalizeStoredMediaUrl(normalizedText.logoImage),
    featureImage: normalizeStoredMediaUrl(normalizedText.featureImage),
  };
}

function productToRow(product: StoredProduct, index: number): ProductRow {
  const printerCategory = product.category === "printers"
    ? resolvePrinterCategory(product.printerCategory, product.name)
    : undefined;
  return {
    id: product.id,
    name: normalizeProductBrandName(product.name),
    family: product.family,
    image: normalizeStoredMediaUrl(product.image),
    category: printerCategory ?? product.category,
    type: product.type,
    size: product.size,
    badge: product.badge || null,
    price: product.price || null,
    description: product.description,
    features: product.features,
    sort_order: product.sortOrder ?? index,
  };
}

function productFromRow(row: ProductRow): StoredProduct {
  const storedPrinterCategory = isPrinterCategory(row.category) ? row.category : undefined;
  const category = storedPrinterCategory ? "printers" : row.category;
  return {
    id: Number(row.id),
    name: normalizeProductBrandName(row.name),
    family: row.family,
    image: normalizeStoredMediaUrl(row.image),
    category,
    printerCategory: category === "printers"
      ? resolvePrinterCategory(storedPrinterCategory, row.name)
      : undefined,
    type: row.type,
    size: row.size,
    badge: row.badge || undefined,
    price: row.price || undefined,
    description: row.description,
    features: normalizeFeatures(row.features),
    sortOrder: row.sort_order,
  };
}

function heroSlideToRow(slide: Omit<HeroSlide, "id"> | HeroSlide) {
  const row = {
    title: normalizeLegacyArabicText(slide.title),
    subtitle: normalizeLegacyArabicText(slide.subtitle),
    description: normalizeLegacyArabicText(slide.description),
    badge_text: normalizeLegacyArabicText(slide.badgeText),
    image_url: normalizeStoredMediaUrl(slide.imageUrl),
    image_alt: slide.imageAlt,
    primary_button_text: slide.primaryButtonText,
    primary_button_url: slide.primaryButtonUrl,
    secondary_button_text: slide.secondaryButtonText,
    secondary_button_url: slide.secondaryButtonUrl,
    display_order: slide.displayOrder,
    is_active: slide.isActive,
  };
  return "id" in slide ? { id: slide.id, ...row } : row;
}

function heroSlideFromRow(row: HeroSlideRow): HeroSlide {
  return {
    id: Number(row.id),
    title: normalizeLegacyArabicText(row.title),
    subtitle: normalizeLegacyArabicText(row.subtitle),
    description: normalizeLegacyArabicText(row.description),
    badgeText: normalizeLegacyArabicText(row.badge_text),
    imageUrl: normalizeStoredMediaUrl(row.image_url),
    imageAlt: row.image_alt,
    primaryButtonText: row.primary_button_text,
    primaryButtonUrl: row.primary_button_url,
    secondaryButtonText: row.secondary_button_text,
    secondaryButtonUrl: row.secondary_button_url,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}

function heroSettingsToRow(settings: HeroSettings) {
  return {
    id: 1,
    autoplay_enabled: settings.autoplayEnabled,
    autoplay_delay: settings.autoplayDelay,
    show_arrows: settings.showArrows,
    show_dots: settings.showDots,
    pause_on_hover: settings.pauseOnHover,
    updated_at: new Date().toISOString(),
  };
}

function heroSettingsFromRow(row: HeroSettingsRow | null): HeroSettings {
  if (!row) return defaultHeroSettings;
  return {
    autoplayEnabled: row.autoplay_enabled,
    autoplayDelay: row.autoplay_delay,
    showArrows: row.show_arrows,
    showDots: row.show_dots,
    pauseOnHover: row.pause_on_hover,
  };
}

export async function ensureSiteDefaults() {
  const client = getSupabaseAdmin();
  const settingsResult = await client.from("site_settings").select("id").eq("id", 1).maybeSingle();
  databaseError("تعذر فحص إعدادات الموقع", settingsResult.error);
  if (!settingsResult.data) {
    const result = await client.from("site_settings").upsert({ id: 1, payload: defaultSiteSettings }, { onConflict: "id" });
    databaseError("تعذر إنشاء إعدادات الموقع", result.error);
  }

  const productsResult = await client.from("products").select("id").limit(1);
  databaseError("تعذر فحص المنتجات", productsResult.error);
  if (!productsResult.data?.length) {
    const result = await client.from("products").upsert(
      starterProducts.map(productToRow),
      { onConflict: "id", ignoreDuplicates: true },
    );
    databaseError("تعذر إضافة المنتجات الافتراضية", result.error);
  }
}

export async function getSiteData() {
  await ensureSiteDefaults();
  const client = getSupabaseAdmin();
  const [settingsResult, productsResult] = await Promise.all([
    client.from("site_settings").select("payload").eq("id", 1).single(),
    client.from("products").select("*").order("sort_order", { ascending: true }).order("id", { ascending: true }),
  ]);
  databaseError("تعذر تحميل إعدادات الموقع", settingsResult.error);
  databaseError("تعذر تحميل المنتجات", productsResult.error);

  return {
    settings: normalizeSiteSettingsMedia({
      ...defaultSiteSettings,
      ...((settingsResult.data?.payload ?? {}) as Partial<SiteSettings>),
    }),
    products: ((productsResult.data ?? []) as ProductRow[]).map(productFromRow),
  };
}

export async function replaceSiteData(settings: SiteSettings, products: StoredProduct[]) {
  const client = getSupabaseAdmin();
  const result = await client.rpc("replace_site_data", {
    p_settings: normalizeSiteSettingsMedia(settings),
    p_products: products.map(productToRow),
  });
  databaseError("تعذر حفظ بيانات الموقع", result.error);
}

export async function ensureHeroDefaults() {
  const client = getSupabaseAdmin();
  const [settingsResult, slidesResult] = await Promise.all([
    client.from("hero_settings").select("id").eq("id", 1).maybeSingle(),
    client.from("hero_slides").select("id").limit(1),
  ]);
  databaseError("تعذر فحص إعدادات البانر", settingsResult.error);
  databaseError("تعذر فحص شرائح البانر", slidesResult.error);
  const freshDatabase = !settingsResult.data && !slidesResult.data?.length;

  if (!settingsResult.data) {
    const result = await client.from("hero_settings").upsert(heroSettingsToRow(defaultHeroSettings), { onConflict: "id" });
    databaseError("تعذر إنشاء إعدادات البانر", result.error);
  }

  if (freshDatabase) {
    const result = await client.from("hero_slides").upsert(
      defaultHeroSlides.map(heroSlideToRow),
      { onConflict: "id", ignoreDuplicates: true },
    );
    databaseError("تعذر إضافة شرائح البانر الافتراضية", result.error);
  }
}

export async function getHeroData(activeOnly: boolean) {
  await ensureHeroDefaults();
  const client = getSupabaseAdmin();
  let slidesQuery = client.from("hero_slides").select("*");
  if (activeOnly) slidesQuery = slidesQuery.eq("is_active", true);

  const [slidesResult, settingsResult] = await Promise.all([
    slidesQuery.order("display_order", { ascending: true }).order("id", { ascending: true }),
    client.from("hero_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  databaseError("تعذر تحميل شرائح البانر", slidesResult.error);
  databaseError("تعذر تحميل إعدادات البانر", settingsResult.error);

  return {
    slides: ((slidesResult.data ?? []) as HeroSlideRow[]).map(heroSlideFromRow),
    settings: heroSettingsFromRow(settingsResult.data as HeroSettingsRow | null),
  };
}

export async function createHeroSlide(input: Omit<HeroSlide, "id">) {
  const client = getSupabaseAdmin();
  const result = await client.from("hero_slides").insert(heroSlideToRow(input)).select("*").single();
  databaseError("تعذر إضافة الشريحة", result.error);
  return heroSlideFromRow(result.data as HeroSlideRow);
}

export async function updateHeroSlide(id: number, input: Omit<HeroSlide, "id">) {
  const client = getSupabaseAdmin();
  const result = await client.from("hero_slides").update({
    ...heroSlideToRow(input),
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").maybeSingle();
  databaseError("تعذر تعديل الشريحة", result.error);
  return result.data ? heroSlideFromRow(result.data as HeroSlideRow) : null;
}

export async function removeHeroSlide(id: number) {
  const client = getSupabaseAdmin();
  const result = await client.from("hero_slides").delete().eq("id", id).select("id").maybeSingle();
  databaseError("تعذر حذف الشريحة", result.error);
  return Boolean(result.data);
}

export async function saveHeroSettings(settings: HeroSettings) {
  const client = getSupabaseAdmin();
  const result = await client.from("hero_settings").upsert(heroSettingsToRow(settings), { onConflict: "id" }).select("*").single();
  databaseError("تعذر حفظ إعدادات البانر", result.error);
  return heroSettingsFromRow(result.data as HeroSettingsRow);
}
