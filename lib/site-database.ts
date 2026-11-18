import { getSupabaseAdmin } from "./supabase-server";
import type { AdminLoginRateLimitResult } from "../app/site-defaults";

// One atomic reservation, with no retries: retrying could consume two attempts.
export async function consumeAdminLoginAttempt(clientKey: string): Promise<AdminLoginRateLimitResult> {
  const { data, error } = await getSupabaseAdmin()
    .rpc("consume_admin_login_attempt", { p_client_key: clientKey })
    .abortSignal(AbortSignal.timeout(3000));
  if (error || !Array.isArray(data) || data.length !== 1) throw new Error("Login rate limiter is unavailable");
  const row: unknown = data[0];
  if (!row || typeof row !== "object" || !("allowed" in row) || !("retry_after_seconds" in row)
    || typeof row.allowed !== "boolean" || !Number.isSafeInteger(row.retry_after_seconds)
    || Number(row.retry_after_seconds) < 0 || Number(row.retry_after_seconds) > 900
    || (row.allowed ? row.retry_after_seconds !== 0 : Number(row.retry_after_seconds) < 1)) {
    throw new Error("Invalid login rate limiter response");
  }
  return { allowed: row.allowed, retryAfterSeconds: Number(row.retry_after_seconds) };
}
import { DEFAULT_SUPABASE_STORAGE_BUCKET, normalizeMediaUrl } from "./media-url";
import { PRINTER_CATEGORIES, isPrinterCategory, resolvePrinterCategory } from "../app/printer-categories";
import {
  isHomeProductCategory,
  type HomeProductOrderItem,
} from "../app/home-product-order";
import {
  normalizePrinterSpecifications,
  normalizeSpecificationsSourceUrl,
  normalizeSpecificationsVerifiedAt,
} from "../app/printer-specifications";
import { normalizePaperSpecifications } from "../app/paper-specifications";
import { normalizeInkSpecifications } from "../app/ink-specifications";
import { isInkCategory } from "../app/laser-inks";
import { PUBLIC_ENABLED_CATEGORIES, type PublicEnabledCategory } from "../app/public-categories";
import type { PublicSearchProduct } from "../app/global-product-search";
import {
  hasPrinterPageContent,
  normalizePrinterPageContent,
} from "../app/printer-page-content";
import {
  PAPER_SPECIFICATIONS_UPDATE_TARGETS,
  buildPaperSpecificationsUpdatePreview,
  mergePaperSpecificationsUpdate,
  type PaperSpecificationsUpdatePreview,
  type PaperSpecificationsUpdateRow,
} from "./paper-specifications-update";
import {
  defaultHeroSettings,
  defaultHeroSlides,
  defaultSiteSettings,
  categoryImageDefinitions,
  normalizeLegacyArabicText,
  normalizeProductBrandName,
  starterProducts,
  type HeroSettings,
  type HeroSlide,
  type ProductModel,
  type ProductModelVariant,
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
  specifications: unknown | null;
  printer_page_content: unknown | null;
  specifications_source_url: string | null;
  specifications_verified_at: string | null;
  sort_order: number;
  home_display_order: number | null;
  product_models?: ProductModelRow[] | null;
};

type SitemapProductRow = {
  id: number;
  name: string;
  category: string;
  updated_at: string | null;
};

type ProductModelRow = {
  id: number;
  product_id: number;
  model: string;
  part_number: string | null;
  color: string | null;
  compatibility: string | null;
  availability: ProductModel["availability"];
  price: string | null;
  image: string | null;
  sort_order: number;
  is_active: boolean;
  product_model_variants?: ProductModelVariantRow[] | null;
};

type ProductModelVariantRow = {
  id: number;
  product_model_id: number;
  color: string;
  part_number: string;
  availability: ProductModelVariant["availability"];
  image: string | null;
  sort_order: number;
  is_active: boolean;
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

type DatabaseErrorLike = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
};

class DatabaseOperationError extends Error {
  code?: string;
  status?: number;

  constructor(prefix: string, error: DatabaseErrorLike) {
    super(`${prefix}: ${error.message}`);
    this.name = "DatabaseOperationError";
    this.code = error.code;
    this.status = error.status;
  }
}

function databaseError(message: string, error: DatabaseErrorLike | null) {
  if (error) throw new DatabaseOperationError(message, error);
}

function isTransientDatabaseError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof DatabaseOperationError) {
    const code = error.code;
    const status = error.status;
    if (status === 401 || status === 403 || code === "42501" || code === "PGRST301") return false;
    if (code && (code.startsWith("42") || code.startsWith("22") || code.startsWith("23"))) return false;
    if (status && (status >= 500 || status === 408 || status === 429)) return true;
    if (code && (code.startsWith("08") || code.startsWith("57") || code === "53300")) return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("غير مضبوط") || message.includes("غير صالح")) return false;
  if (/permission|unauthorized|forbidden|jwt|syntax/i.test(message)) return false;

  if (/fetch failed|econnreset|etimedout|econnrefused|socket|timeout|network|502|503|504/i.test(message)) {
    return true;
  }

  if (error instanceof Error && "cause" in error && error.cause) {
    const causeMsg = String(error.cause);
    if (/econnreset|etimedout|econnrefused|socket|timeout|network/i.test(causeMsg)) {
      return true;
    }
  }

  return false;
}

async function withDatabaseRetry<T>(operation: () => Promise<T>, maxRetries = 2, delayMs = 150): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries && isTransientDatabaseError(error)) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
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
    categoryImages: Object.fromEntries(categoryImageDefinitions.map(({ key }) => [
      key,
      normalizeStoredMediaUrl(normalizedText.categoryImages?.[key] ?? ""),
    ])) as SiteSettings["categoryImages"],
  };
}

function productModelToRow(model: ProductModel) {
  return {
    id: model.id,
    model: model.model.trim(),
    part_number: model.partNumber?.trim() || null,
    color: model.color?.trim() || null,
    compatibility: model.compatibility?.trim() || null,
    availability: model.availability,
    price: model.price?.trim() || null,
    image: model.image ? normalizeStoredMediaUrl(model.image) : null,
    sort_order: model.sortOrder,
    is_active: model.isActive,
    variants: (model.variants ?? []).map((variant) => ({
      id: variant.id,
      color: variant.color.trim(),
      part_number: variant.partNumber.trim(),
      availability: variant.availability,
      image: variant.image ? normalizeStoredMediaUrl(variant.image) : null,
      sort_order: variant.sortOrder,
      is_active: variant.isActive,
    })),
  };
}

function productModelVariantFromRow(row: ProductModelVariantRow): ProductModelVariant {
  return {
    id: Number(row.id), productModelId: Number(row.product_model_id), color: row.color,
    partNumber: row.part_number, availability: row.availability,
    image: row.image ? normalizeStoredMediaUrl(row.image) : undefined,
    sortOrder: row.sort_order, isActive: row.is_active,
  };
}

function productModelFromRow(row: ProductModelRow): ProductModel {
  return {
    id: Number(row.id), productId: Number(row.product_id), model: row.model,
    partNumber: row.part_number || undefined, color: row.color || undefined,
    compatibility: row.compatibility || undefined, availability: row.availability,
    price: row.price || undefined, image: row.image ? normalizeStoredMediaUrl(row.image) : undefined,
    sortOrder: row.sort_order, isActive: row.is_active,
    variants: (row.product_model_variants ?? []).map(productModelVariantFromRow),
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
    image: normalizeStoredMediaUrl(isInkCategory(product.category) || product.category === "papers" ? product.images?.[0] || product.image : product.image),
    category: printerCategory ?? product.category,
    type: product.type,
    size: product.size,
    badge: product.badge || null,
    price: product.price || null,
    description: product.description,
    features: product.features,
    specifications: product.category === "papers"
      ? { ...(product.paperSpecifications ?? {}), images: product.images ?? product.paperSpecifications?.images ?? (product.image ? [product.image] : []) }
      : isInkCategory(product.category)
        ? { ...(product.inkSpecifications ?? {}), images: product.images ?? product.inkSpecifications?.images ?? (product.image ? [product.image] : []) }
        : product.specifications ?? null,
    printer_page_content: product.category === "printers"
      ? product.printerPageContent ?? null
      : product.category === "papers" ? product.paperPageContent ?? null : null,
    specifications_source_url: product.specificationsSourceUrl || null,
    specifications_verified_at: product.specificationsVerifiedAt || null,
    sort_order: product.sortOrder ?? index,
    home_display_order: product.homeDisplayOrder
      ?? (isHomeProductCategory(product.category) ? product.sortOrder ?? index : null),
  };
}

function productFromRow(row: ProductRow): StoredProduct {
  const storedPrinterCategory = isPrinterCategory(row.category) ? row.category : undefined;
  const category = storedPrinterCategory ? "printers" : row.category;
  const storedPrinterPageContent = normalizePrinterPageContent(row.printer_page_content);
  const inkSpecifications = isInkCategory(category) ? normalizeInkSpecifications(row.specifications) : undefined;
  const inkImages = isInkCategory(category)
    ? (inkSpecifications?.images.length ? inkSpecifications.images : row.image ? [normalizeStoredMediaUrl(row.image)] : [])
    : undefined;
  return {
    id: Number(row.id),
    name: normalizeProductBrandName(row.name),
    family: row.family,
    image: inkImages?.[0] ?? normalizeStoredMediaUrl(row.image),
    images: category === "papers"
      ? (normalizePaperSpecifications(row.specifications)?.images?.length ? normalizePaperSpecifications(row.specifications)?.images : row.image ? [normalizeStoredMediaUrl(row.image)] : [])
      : inkImages,
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
    specifications: category === "printers" ? normalizePrinterSpecifications(row.specifications) : undefined,
    printerPageContent: category === "printers" && hasPrinterPageContent(storedPrinterPageContent)
      ? storedPrinterPageContent
      : undefined,
    paperPageContent: category === "papers" && hasPrinterPageContent(storedPrinterPageContent)
      ? storedPrinterPageContent
      : undefined,
    paperSpecifications: category === "papers" ? normalizePaperSpecifications(row.specifications) : undefined,
    inkSpecifications: inkSpecifications ? { ...inkSpecifications, images: inkImages ?? [] } : undefined,
    specificationsSourceUrl: normalizeSpecificationsSourceUrl(row.specifications_source_url),
    specificationsVerifiedAt: normalizeSpecificationsVerifiedAt(row.specifications_verified_at),
    sortOrder: row.sort_order,
    homeDisplayOrder: row.home_display_order ?? undefined,
    models: (row.product_models ?? []).map(productModelFromRow),
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

export type SiteData = {
  settings: SiteSettings;
  products: StoredProduct[];
};

const PRODUCT_SELECT = "*, product_models(*, product_model_variants(*))";
const PRODUCT_SUMMARY_SELECT = "id,name,image,category,type,sort_order,images:specifications->images,paper_name:specifications->nameEn,paper_type:specifications->paperType";
const SEARCH_SELECT = `${PRODUCT_SUMMARY_SELECT},family,description,ink_brand:specifications->brand,ink_type:specifications->inkType,product_models(id,model,part_number,compatibility,is_active,product_model_variants(id,color,part_number,is_active))`;

function storedCategories(category: PublicEnabledCategory): string[] {
  return category === "printers" ? ["printers", ...PRINTER_CATEGORIES.map(({ value }) => value)] : [category];
}

// Use the returned row count, not the requested range: PostgREST can cap a
// range below our page size. An exact total also avoids an extra empty request.
async function readAllPages<T>(
  read: (from: number, to: number, count: boolean) => PromiseLike<{ data: T[] | null; count: number | null; error: DatabaseErrorLike | null }>,
  errorMessage: string,
): Promise<T[]> {
  const rows: T[] = [];
  let total: number | null = null;
  while (true) {
    const page = await withDatabaseRetry(async () => {
      const result = await read(rows.length, rows.length + 249, rows.length === 0);
      databaseError(errorMessage, result.error);
      return result;
    });
    if (total === null) total = page.count;
    if (!page.data?.length) {
      if (total !== null && rows.length < total) throw new Error(errorMessage);
      return rows;
    }
    rows.push(...page.data);
    if (total !== null && rows.length >= total) return rows;
  }
}

export async function getSiteSettings() {
  return withDatabaseRetry(async () => {
    const result = await getSupabaseAdmin().from("site_settings").select("payload").eq("id", 1).maybeSingle();
    databaseError("تعذر تحميل إعدادات الموقع", result.error);
    return normalizeSiteSettingsMedia({
      ...defaultSiteSettings,
      ...((result.data?.payload ?? {}) as Partial<SiteSettings>),
    });
  });
}

async function getProducts(categories?: string[], homeOrder = false) {
  const rows = await readAllPages<ProductRow>((from, to, count) => {
    let query = getSupabaseAdmin().from("products").select(PRODUCT_SELECT, count ? { count: "exact" } : undefined);
    if (categories) query = query.in("category", categories);
    if (homeOrder) query = query.order("home_display_order", { ascending: true, nullsFirst: false });
    return query.order("sort_order").order("id").range(from, to);
  }, "تعذر تحميل المنتجات");
  return rows.map(productFromRow);
}

export async function getCategoryData(category: PublicEnabledCategory): Promise<SiteData> {
  const [settings, products] = await Promise.all([getSiteSettings(), getProducts(storedCategories(category))]);
  return { settings, products };
}

export async function getProductSummaries(category: "printers" | "papers" | "laser_inks", excludedId?: number) {
  type SummaryRow = Pick<ProductRow, "id" | "name" | "image" | "category" | "type" | "sort_order"> & {
    images: unknown;
    paper_name: unknown;
    paper_type: unknown;
  };
  const rows = await readAllPages<SummaryRow>((from, to, count) => {
    let query = getSupabaseAdmin().from("products").select(PRODUCT_SUMMARY_SELECT, count ? { count: "exact" } : undefined)
      .in("category", storedCategories(category));
    if (excludedId !== undefined) query = query.neq("id", excludedId);
    return query.order("sort_order").order("id").range(from, to);
  }, "تعذر تحميل ملخصات المنتجات");
  return rows.map((row) => {
    const name = normalizeProductBrandName(row.name);
    const paper = category === "papers" ? normalizePaperSpecifications({
      images: row.images, nameEn: row.paper_name, paperType: row.paper_type,
    }) : undefined;
    const ink = category === "laser_inks" ? normalizeInkSpecifications({ images: row.images }) : undefined;
    return {
      id: Number(row.id), name, category, type: row.type,
      image: ink?.images[0] ? normalizeStoredMediaUrl(ink.images[0]) : normalizeStoredMediaUrl(row.image),
      printerCategory: category === "printers" ? resolvePrinterCategory(row.category, name) : undefined,
      images: paper?.images, paperSpecifications: paper,
    };
  });
}

export async function getPublicSearchProducts(): Promise<PublicSearchProduct[]> {
  type SearchRow = Pick<ProductRow, "id" | "name" | "image" | "category" | "type" | "family" | "description"> & {
    images: unknown; paper_name: unknown; paper_type: unknown; ink_brand: unknown; ink_type: unknown;
    product_models?: (Pick<ProductModelRow, "id" | "model" | "part_number" | "compatibility" | "is_active"> & {
      product_model_variants?: Pick<ProductModelVariantRow, "id" | "color" | "part_number" | "is_active">[];
    })[];
  };
  const rows = await readAllPages<SearchRow>((from, to, count) => getSupabaseAdmin().from("products")
    .select(SEARCH_SELECT, count ? { count: "exact" } : undefined)
    .in("category", PUBLIC_ENABLED_CATEGORIES.flatMap(storedCategories))
    .eq("product_models.is_active", true)
    .eq("product_models.product_model_variants.is_active", true)
    .order("sort_order").order("id").range(from, to), "تعذر تحميل فهرس البحث");
  return rows.map((row) => {
    const name = normalizeProductBrandName(row.name);
    const printerCategory = isPrinterCategory(row.category) ? row.category : undefined;
    const category = printerCategory ? "printers" : row.category;
    const ink = isInkCategory(category) ? normalizeInkSpecifications({ images: row.images, brand: row.ink_brand, inkType: row.ink_type }) : undefined;
    const paper = category === "papers" ? normalizePaperSpecifications({ nameEn: row.paper_name, paperType: row.paper_type }) : undefined;
    return {
      id: Number(row.id), name, category, family: row.family, type: row.type, description: row.description,
      image: normalizeStoredMediaUrl(ink?.images[0] || row.image),
      printerCategory: category === "printers" ? resolvePrinterCategory(printerCategory, name) : undefined,
      inkSpecifications: ink && { brand: ink.brand, inkType: ink.inkType },
      paperSpecifications: paper && { nameEn: paper.nameEn, paperType: paper.paperType },
      models: row.product_models?.map((model) => ({
        id: Number(model.id), model: model.model, partNumber: model.part_number || undefined,
        compatibility: model.compatibility || undefined, isActive: model.is_active,
        variants: model.product_model_variants?.map((variant) => ({
          id: Number(variant.id), color: variant.color, partNumber: variant.part_number, isActive: variant.is_active,
        })),
      })),
    };
  });
}

export type HeroData = {
  slides: HeroSlide[];
  settings: HeroSettings;
};

let siteDefaultsEnsured = false;
export async function ensureSiteDefaults(force = false) {
  if (siteDefaultsEnsured && !force) return;
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
  siteDefaultsEnsured = true;
}

export async function getSiteData(): Promise<SiteData> {
  const [settings, products] = await Promise.all([getSiteSettings(), getProducts()]);
  return { settings, products };
}

export async function getSitemapProducts() {
  const rows = await readAllPages<SitemapProductRow>((from, to, count) => getSupabaseAdmin()
    .from("products")
    .select("id,name,category,updated_at", count ? { count: "exact" } : undefined)
    .order("id").range(from, to), "تعذر تحميل منتجات خريطة الموقع");
  return rows.map((row) => ({
    id: Number(row.id),
    name: normalizeProductBrandName(row.name),
    category: isPrinterCategory(row.category) ? "printers" : row.category,
    updatedAt: row.updated_at || undefined,
  }));
}

export async function getHomeData(): Promise<SiteData> {
  const [settings, products] = await Promise.all([getSiteSettings(), getProducts(undefined, true)]);
  return { settings, products };
}

export async function getProductById(id: number) {
  return withDatabaseRetry(async () => {
    const result = await getSupabaseAdmin()
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("id", id)
      .maybeSingle();
    databaseError("تعذر تحميل المنتج", result.error);
    return result.data ? productFromRow(result.data as ProductRow) : null;
  });
}

export async function replaceSiteData(settings: SiteSettings, products: StoredProduct[]) {
  const client = getSupabaseAdmin();
  const result = await client.rpc("replace_site_data", {
    p_settings: normalizeSiteSettingsMedia(settings),
    p_products: products.map(productToRow),
  });
  databaseError("تعذر حفظ بيانات الموقع", result.error);

  const productsWithStructuredSpecifications = products.filter((product) =>
    product.specifications !== undefined || product.paperSpecifications !== undefined || product.inkSpecifications !== undefined
      || product.specificationsSourceUrl || product.specificationsVerifiedAt
      || (product.printerPageContent && hasPrinterPageContent(product.printerPageContent))
      || (product.paperPageContent && hasPrinterPageContent(product.paperPageContent))
  );
  const specificationResults = await Promise.all(productsWithStructuredSpecifications.map((product) => client
    .from("products")
    .update({
      specifications: product.category === "papers"
        ? { ...(product.paperSpecifications ?? {}), images: product.images ?? product.paperSpecifications?.images ?? (product.image ? [product.image] : []) }
        : isInkCategory(product.category)
          ? { ...(product.inkSpecifications ?? {}), images: product.images ?? product.inkSpecifications?.images ?? (product.image ? [product.image] : []) }
          : product.specifications ?? null,
      specifications_source_url: product.specificationsSourceUrl || null,
      specifications_verified_at: product.specificationsVerifiedAt || null,
      printer_page_content: product.category === "printers"
        ? product.printerPageContent ?? null
        : product.category === "papers" ? product.paperPageContent ?? null : null,
    })
    .eq("id", product.id)
    .select("id")
    .maybeSingle()));
  const failedSpecificationUpdate = specificationResults.find((updateResult) => updateResult.error || !updateResult.data);
  if (failedSpecificationUpdate) {
    databaseError("تعذر حفظ مواصفات المنتج المنظمة", failedSpecificationUpdate.error);
    throw new Error("تعذر العثور على المنتج أثناء حفظ مواصفاته المنظمة");
  }
}

export async function saveSiteSettings(settings: SiteSettings) {
  const client = getSupabaseAdmin();
  const result = await client
    .from("site_settings")
    .upsert({ id: 1, payload: normalizeSiteSettingsMedia(settings) }, { onConflict: "id" })
    .select("payload")
    .single();
  databaseError("تعذر حفظ إعدادات الموقع", result.error);
  return normalizeSiteSettingsMedia({
    ...defaultSiteSettings,
    ...((result.data?.payload ?? {}) as Partial<SiteSettings>),
  });
}

async function saveProductWithModels(product: StoredProduct, create: boolean) {
  const models = product.models === undefined && create ? [] : product.models;
  if (!Array.isArray(models)) throw new Error("يجب إرسال قائمة موديلات المنتج عند التعديل");
  const row = productToRow(product, product.sortOrder ?? 0);
  const result = await getSupabaseAdmin().rpc("save_product_with_models", {
    p_product: {
      ...row,
      badge: product.category === "printers" ? null : row.badge,
      home_display_order: create ? product.homeDisplayOrder ?? null : row.home_display_order,
    },
    p_models: models.map(productModelToRow),
    p_create: create,
  });
  databaseError("تعذر حفظ المنتج وموديلاته", result.error);
  if (!result.data) throw new Error("لم يُرجع الحفظ بيانات المنتج");
  return productFromRow(result.data as ProductRow);
}

export async function updateProduct(product: StoredProduct) {
  return saveProductWithModels(product, false);
}

export async function createProduct(product: StoredProduct) {
  return saveProductWithModels(product, true);
}

export async function saveHomeProductOrder(items: HomeProductOrderItem[]) {
  const client = getSupabaseAdmin();
  const result = await client.rpc("set_home_product_order", {
    p_items: items.map((item) => ({
      id: item.id,
      category: item.category,
      home_display_order: item.homeDisplayOrder,
    })),
  });
  databaseError("تعذر حفظ ترتيب الواجهة الرئيسية", result.error);
  return (await getSiteData()).products;
}

export async function removeProduct(id: number) {
  const client = getSupabaseAdmin();
  const result = await client
    .from("products")
    .delete()
    .eq("id", id)
    .select("*")
    .maybeSingle();
  databaseError("تعذر حذف المنتج", result.error);
  if (!result.data) throw new Error("تعذر العثور على المنتج أثناء الحذف");
  return productFromRow(result.data as ProductRow);
}

async function loadPaperSpecificationsUpdateRows(): Promise<PaperSpecificationsUpdateRow[]> {
  const client = getSupabaseAdmin();
  const result = await client
    .from("products")
    .select("id,name,specifications")
    .eq("category", "papers")
    .in("name", PAPER_SPECIFICATIONS_UPDATE_TARGETS.map((target) => target.name));
  databaseError("تعذر قراءة منتجات الأوراق الحالية", result.error);
  return ((result.data ?? []) as Array<{ id: number; name: string; specifications: unknown | null }>).map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    specifications: row.specifications,
  }));
}

export async function getPaperSpecificationsUpdatePreview(): Promise<PaperSpecificationsUpdatePreview> {
  return buildPaperSpecificationsUpdatePreview(await loadPaperSpecificationsUpdateRows());
}

export async function applyPaperSpecificationsUpdate() {
  const rows = await loadPaperSpecificationsUpdateRows();
  const preview = buildPaperSpecificationsUpdatePreview(rows);
  if (!preview.ready) {
    throw new Error(`تم العثور على ${preview.matchedCount} من أصل ${preview.expectedCount} منتجات مطلوبة؛ تم إلغاء التنفيذ`);
  }

  const rowsByName = new Map(rows.map((row) => [row.name, row]));
  const pendingNames = new Set(preview.products.filter((product) => !product.alreadyCurrent).map((product) => product.name));
  const client = getSupabaseAdmin();
  const updateResults = await Promise.all(PAPER_SPECIFICATIONS_UPDATE_TARGETS
    .filter((target) => pendingNames.has(target.name))
    .map(async (target) => {
      const row = rowsByName.get(target.name);
      if (!row) throw new Error(`تعذر العثور على المنتج: ${target.name}`);
      const desiredSpecifications = mergePaperSpecificationsUpdate(row.specifications, target.patch);
      const result = await client
        .from("products")
        .update({ specifications: desiredSpecifications })
        .eq("id", row.id)
        .eq("name", target.name)
        .eq("category", "papers")
        .select("id")
        .maybeSingle();
      databaseError(`تعذر تحديث مواصفات المنتج ${target.name}`, result.error);
      if (!result.data) throw new Error(`لم يتم تحديث المنتج المطابق: ${target.name}`);
      return row.id;
    }));

  const verification = await getPaperSpecificationsUpdatePreview();
  if (!verification.ready || verification.pendingCount !== 0) {
    throw new Error("تعذر التحقق من اكتمال تحديث مواصفات الأوراق");
  }

  return {
    success: true,
    matchedCount: verification.matchedCount,
    updatedCount: updateResults.length,
    names: verification.names,
    preview: verification,
  };
}

let heroDefaultsEnsured = false;
export async function ensureHeroDefaults(force = false) {
  if (heroDefaultsEnsured && !force) return;
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
  heroDefaultsEnsured = true;
}

export async function getHeroData(activeOnly: boolean): Promise<HeroData> {
  return withDatabaseRetry(async () => {
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
  });
}

export async function createHeroSlide(input: Omit<HeroSlide, "id">) {
  const client = getSupabaseAdmin();
  const row = heroSlideToRow(input);
  const result = await client.from("hero_slides").insert(row).select("*").single();
  if (!result.error) return heroSlideFromRow(result.data as HeroSlideRow);

  // The initial slides are seeded with explicit identity values. Existing
  // databases can therefore have a sequence that still points at an occupied
  // id. Recover without changing any existing ids or requiring a migration.
  if (result.error.code === "23505") {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const latest = await client.from("hero_slides").select("id").order("id", { ascending: false }).limit(1).maybeSingle();
      databaseError("تعذر تحديد معرّف الشريحة الجديدة", latest.error);
      const nextId = Number(latest.data?.id ?? 0) + 1;
      const retry = await client.from("hero_slides").insert({ id: nextId, ...row }).select("*").single();
      if (!retry.error) return heroSlideFromRow(retry.data as HeroSlideRow);
      if (retry.error.code !== "23505") databaseError("تعذر إضافة الشريحة", retry.error);
    }
  }

  databaseError("تعذر إضافة الشريحة", result.error);
  throw new Error("تعذر إضافة الشريحة");
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
