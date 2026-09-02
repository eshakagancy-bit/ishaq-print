import { getSupabaseAdmin } from "./supabase-server";
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
import { isInkCategory, isLaserInkCategory } from "../app/laser-inks";
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
    categoryImages: Object.fromEntries(categoryImageDefinitions.map(({ key }) => [
      key,
      normalizeStoredMediaUrl(normalizedText.categoryImages?.[key] ?? ""),
    ])) as SiteSettings["categoryImages"],
  };
}

function productModelToRow(model: ProductModel, productId: number) {
  return {
    id: model.id,
    product_id: productId,
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
      product_model_id: model.id,
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

async function saveProductModels(product: StoredProduct) {
  const result = await getSupabaseAdmin().rpc("sync_product_models", {
    p_product_id: product.id,
    p_models: (product.models ?? []).map((model) => productModelToRow(model, product.id)),
  });
  databaseError("تعذر حفظ موديلات المنتج", result.error);
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
    client.from("products").select("*, product_models(*, product_model_variants(*))").order("sort_order", { ascending: true }).order("id", { ascending: true }),
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

export async function getHomeData() {
  await ensureSiteDefaults();
  const client = getSupabaseAdmin();
  const [settingsResult, productsResult] = await Promise.all([
    client.from("site_settings").select("payload").eq("id", 1).single(),
    client.from("products").select("*, product_models(*, product_model_variants(*))")
      .order("home_display_order", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
  ]);
  databaseError("تعذر تحميل إعدادات الموقع", settingsResult.error);
  databaseError("تعذر تحميل منتجات الصفحة الرئيسية", productsResult.error);

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

export async function updateProduct(product: StoredProduct) {
  const client = getSupabaseAdmin();
  const row = productToRow(product, product.sortOrder ?? 0);
  const updates = product.category === "printers"
    ? Object.fromEntries(Object.entries(row).filter(([key]) => key !== "badge"))
    : row;
  const result = await client
    .from("products")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", product.id)
    .select("*")
    .maybeSingle();
  databaseError("تعذر حفظ المنتج", result.error);
  if (!result.data) throw new Error("تعذر العثور على المنتج أثناء الحفظ");
  await saveProductModels(product);
  return { ...productFromRow(result.data as ProductRow), models: product.models ?? [] };
}

export async function createProduct(product: StoredProduct) {
  const client = getSupabaseAdmin();
  let homeDisplayOrder = product.homeDisplayOrder;
  if ((isHomeProductCategory(product.category) || isLaserInkCategory(product.category)) && homeDisplayOrder === undefined) {
    const databaseCategories = product.category === "printers"
      ? ["printers", ...PRINTER_CATEGORIES.map((category) => category.value)]
      : isLaserInkCategory(product.category) ? ["inks", "laser_inks"] : [product.category];
    const orderResult = await client
      .from("products")
      .select("home_display_order")
      .in("category", databaseCategories);
    databaseError("تعذر تحديد نهاية ترتيب قسم المنتج", orderResult.error);
    const currentOrders = (orderResult.data ?? [])
      .map((row) => Number(row.home_display_order))
      .filter((order) => Number.isSafeInteger(order) && order >= 0);
    homeDisplayOrder = (currentOrders.length ? Math.max(...currentOrders) : -1) + 1;
  }
  const result = await client
    .from("products")
    .insert(productToRow({
      ...product,
      badge: product.category === "printers" ? undefined : product.badge,
      homeDisplayOrder,
    }, product.sortOrder ?? 0))
    .select("*")
    .single();
  databaseError("تعذر إضافة المنتج", result.error);
  const createdProduct = { ...product, id: Number(result.data.id) };
  await saveProductModels(createdProduct);
  return { ...productFromRow(result.data as ProductRow), models: createdProduct.models ?? [] };
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
