import { createProduct, getSiteData, removeProduct, saveSiteSettings, updateProduct } from "../../../lib/site-database";
import { DEFAULT_SUPABASE_STORAGE_BUCKET, normalizeMediaUrl } from "../../../lib/media-url";
import { ADMIN_UNAUTHORIZED_MESSAGE, requireAdminApi } from "../../admin-auth";
import { normalizeBusinessTime, normalizeBusinessWeekdays, sanitizePhoneNumber } from "../../business-hours";
import { resolvePrinterCategory } from "../../printer-categories";
import {
  normalizePrinterSpecifications,
  normalizeSpecificationsSourceUrl,
  normalizeSpecificationsVerifiedAt,
} from "../../printer-specifications";
import { normalizePaperSpecifications } from "../../paper-specifications";
import { normalizeInkSpecifications } from "../../ink-specifications";
import { normalizePrinterPageContent } from "../../printer-page-content";
import {
  defaultSiteSettings,
  categoryImageDefinitions,
  defaultCategoryImages,
  defaultProductPurchaseBenefits,
  normalizeLegacyArabicText,
  normalizeProductBrandName,
  type SiteSettings,
  type StoredProduct,
  type ProductPurchaseBenefits,
  type CategoryImages,
} from "../../site-defaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeSettings(value: unknown): SiteSettings {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const settings = Object.fromEntries(Object.entries(defaultSiteSettings).map(([key, fallback]) => [
    key,
    typeof input[key] === "string" ? normalizeLegacyArabicText(String(input[key]).slice(0, 2000)) : fallback,
  ])) as SiteSettings;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_SUPABASE_STORAGE_BUCKET;
  return {
    ...settings,
    logoImage: normalizeMediaUrl(settings.logoImage, bucket),
    featureImage: normalizeMediaUrl(settings.featureImage, bucket),
    salesPhone: sanitizePhoneNumber(settings.salesPhone) || defaultSiteSettings.salesPhone,
    customerServicePhone: sanitizePhoneNumber(settings.customerServicePhone) || defaultSiteSettings.customerServicePhone,
    generalWhatsapp: sanitizePhoneNumber(settings.generalWhatsapp) || defaultSiteSettings.generalWhatsapp,
    workWeekdays: normalizeBusinessWeekdays(settings.workWeekdays, defaultSiteSettings.workWeekdays),
    workStartTime: normalizeBusinessTime(settings.workStartTime, defaultSiteSettings.workStartTime),
    workEndTime: normalizeBusinessTime(settings.workEndTime, defaultSiteSettings.workEndTime),
    categoryImages: normalizeCategoryImages(input.categoryImages, bucket),
    productPurchaseBenefits: normalizeProductPurchaseBenefits(input.productPurchaseBenefits),
  };
}

function normalizeCategoryImages(value: unknown, bucket: string): CategoryImages {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(categoryImageDefinitions.map(({ key }) => [
    key,
    typeof input[key] === "string"
      ? normalizeMediaUrl(input[key].trim().slice(0, 2000), bucket)
      : defaultCategoryImages[key],
  ])) as CategoryImages;
}

function normalizeProductPurchaseBenefits(value: unknown): ProductPurchaseBenefits {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const items = Array.isArray(input.items)
    ? input.items.slice(0, 30).map((item) => {
      const entry = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return {
        title: String(entry.title ?? "").trim().slice(0, 200),
        description: String(entry.description ?? "").trim().slice(0, 4000),
      };
    }).filter((item) => item.title || item.description)
    : defaultProductPurchaseBenefits.items;
  return {
    title: typeof input.title === "string"
      ? input.title.trim().slice(0, 300)
      : defaultProductPurchaseBenefits.title,
    description: typeof input.description === "string"
      ? input.description.trim().slice(0, 10000)
      : defaultProductPurchaseBenefits.description,
    items,
  };
}

function normalizeProduct(value: unknown, index: number): StoredProduct | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const name = String(input.name ?? "").trim().slice(0, 180);
  const category = String(input.category ?? "").trim().slice(0, 80);
  if (!name || !category) return null;
  const inkSpecifications = category === "inks"
    ? normalizeInkSpecifications(input.inkSpecifications ?? input.specifications)
    : undefined;
  const legacyImage = normalizeMediaUrl(
    String(input.image ?? "/brand/eshak-logo.png").trim().slice(0, 1000),
    process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_SUPABASE_STORAGE_BUCKET,
  );
  const images = category === "inks" || category === "papers"
    ? [...new Set((Array.isArray(input.images) ? input.images : inkSpecifications?.images ?? [])
      .map(String)
      .map((image) => normalizeMediaUrl(image.trim().slice(0, 1000)))
      .filter(Boolean))]
    : undefined;
  if ((category === "inks" || category === "papers") && images && !images.length && legacyImage) images.push(legacyImage);
  return {
    id: Number.isSafeInteger(Number(input.id)) && Number(input.id) > 0 ? Number(input.id) : Date.now() + index,
    slug: String(input.slug ?? "").trim().slice(0, 200) || undefined,
    name: normalizeProductBrandName(name),
    family: String(input.family ?? "").trim().slice(0, 120),
    image: images?.[0] ?? legacyImage,
    images,
    category,
    printerCategory: category === "printers"
      ? resolvePrinterCategory(input.printerCategory, name)
      : undefined,
    type: String(input.type ?? "").trim().slice(0, 100),
    size: String(input.size ?? "").trim().slice(0, 100),
    badge: String(input.badge ?? "").trim().slice(0, 80) || undefined,
    price: String(input.price ?? "").trim().slice(0, 80) || undefined,
    description: String(input.description ?? "").trim().slice(0, 1200),
    features: Array.isArray(input.features)
      ? input.features.map(String).map((item) => item.trim().slice(0, 120)).filter(Boolean).slice(0, 8)
      : [],
    specifications: category === "printers" ? normalizePrinterSpecifications(input.specifications) : undefined,
    printerPageContent: category === "printers" && input.printerPageContent
      ? normalizePrinterPageContent(input.printerPageContent)
      : undefined,
    paperPageContent: category === "papers" && input.paperPageContent
      ? normalizePrinterPageContent(input.paperPageContent)
      : undefined,
    paperSpecifications: category === "papers"
      ? normalizePaperSpecifications(input.paperSpecifications ?? input.specifications)
      : undefined,
    inkSpecifications: inkSpecifications ? { ...inkSpecifications, images: images ?? [] } : undefined,
    specificationsSourceUrl: normalizeSpecificationsSourceUrl(input.specificationsSourceUrl),
    specificationsVerifiedAt: normalizeSpecificationsVerifiedAt(input.specificationsVerifiedAt),
    sortOrder: Number.isSafeInteger(Number(input.sortOrder)) && Number(input.sortOrder) >= 0
      ? Number(input.sortOrder)
      : index,
  };
}

export async function GET() {
  try {
    const data = await getSiteData();
    return Response.json({
      settings: normalizeSettings(data.settings),
      products: data.products,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تحميل بيانات الموقع" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!await requireAdminApi()) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    const payload = await request.json() as { settings?: unknown };
    const settings = normalizeSettings(payload.settings);
    const savedSettings = await saveSiteSettings(settings);
    return Response.json({ ok: true, settings: savedSettings });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر حفظ التعديلات" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await requireAdminApi()) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    const payload = await request.json() as { product?: unknown };
    const product = normalizeProduct(payload.product, 0);
    if (!product) return Response.json({ error: "بيانات المنتج غير صالحة" }, { status: 400 });
    const savedProduct = await createProduct(product);
    return Response.json({ ok: true, product: savedProduct }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر إضافة المنتج" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!await requireAdminApi()) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    const payload = await request.json() as { product?: unknown };
    const product = normalizeProduct(payload.product, 0);
    if (!product) return Response.json({ error: "بيانات المنتج غير صالحة" }, { status: 400 });
    const savedProduct = await updateProduct(product);
    return Response.json({ ok: true, product: savedProduct });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر حفظ المنتج" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!await requireAdminApi()) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    const payload = await request.json() as { id?: unknown };
    const id = Number(payload.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return Response.json({ error: "معرّف المنتج غير صالح" }, { status: 400 });
    }
    const deletedProduct = await removeProduct(id);
    return Response.json({ ok: true, product: deletedProduct });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر حذف المنتج" }, { status: 500 });
  }
}
