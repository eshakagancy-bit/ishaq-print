import { getSiteData, replaceSiteData } from "../../../lib/site-database";
import { DEFAULT_SUPABASE_STORAGE_BUCKET, normalizeMediaUrl } from "../../../lib/media-url";
import { ADMIN_UNAUTHORIZED_MESSAGE, requireAdminApi } from "../../admin-auth";
import { normalizeBusinessTime, normalizeBusinessWeekdays, sanitizePhoneNumber } from "../../business-hours";
import { resolvePrinterCategory } from "../../printer-categories";
import {
  normalizePrinterSpecifications,
  normalizeSpecificationsSourceUrl,
  normalizeSpecificationsVerifiedAt,
} from "../../printer-specifications";
import {
  defaultSiteSettings,
  normalizeLegacyArabicText,
  normalizeProductBrandName,
  type SiteSettings,
  type StoredProduct,
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
  };
}

function normalizeProduct(value: unknown, index: number): StoredProduct | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const name = String(input.name ?? "").trim().slice(0, 180);
  const category = String(input.category ?? "").trim().slice(0, 80);
  if (!name || !category) return null;
  return {
    id: Number.isSafeInteger(Number(input.id)) && Number(input.id) > 0 ? Number(input.id) : Date.now() + index,
    name: normalizeProductBrandName(name),
    family: String(input.family ?? "").trim().slice(0, 120),
    image: normalizeMediaUrl(
      String(input.image ?? "/brand/eshak-logo.png").trim().slice(0, 1000),
      process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_SUPABASE_STORAGE_BUCKET,
    ),
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
    specifications: normalizePrinterSpecifications(input.specifications),
    specificationsSourceUrl: normalizeSpecificationsSourceUrl(input.specificationsSourceUrl),
    specificationsVerifiedAt: normalizeSpecificationsVerifiedAt(input.specificationsVerifiedAt),
    sortOrder: index,
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
    const payload = await request.json() as { settings?: unknown; products?: unknown };
    const settings = normalizeSettings(payload.settings);
    const normalizedProducts = Array.isArray(payload.products)
      ? payload.products.map(normalizeProduct).filter((product): product is StoredProduct => Boolean(product)).slice(0, 500)
      : [];
    const products = [...new Map(normalizedProducts.map((product) => [product.id, product])).values()];
    await replaceSiteData(settings, products);
    return Response.json({ ok: true, settings, products });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر حفظ التعديلات" }, { status: 500 });
  }
}
