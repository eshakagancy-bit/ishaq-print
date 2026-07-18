import { getSiteData, replaceSiteData } from "../../../lib/site-database";
import { DEFAULT_SUPABASE_STORAGE_BUCKET, normalizeMediaUrl } from "../../../lib/media-url";
import { requireAdminApi } from "../../admin-auth";
import { defaultSiteSettings, type SiteSettings, type StoredProduct } from "../../site-defaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeSettings(value: unknown): SiteSettings {
  const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const settings = Object.fromEntries(Object.entries(defaultSiteSettings).map(([key, fallback]) => [
    key,
    typeof input[key] === "string" ? String(input[key]).slice(0, 2000) : fallback,
  ])) as SiteSettings;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_SUPABASE_STORAGE_BUCKET;
  return {
    ...settings,
    logoImage: normalizeMediaUrl(settings.logoImage, bucket),
    heroImage: normalizeMediaUrl(settings.heroImage, bucket),
    featureImage: normalizeMediaUrl(settings.featureImage, bucket),
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
    name,
    family: String(input.family ?? "").trim().slice(0, 120),
    image: normalizeMediaUrl(
      String(input.image ?? "/brand/eshak-logo.png").trim().slice(0, 1000),
      process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_SUPABASE_STORAGE_BUCKET,
    ),
    category,
    type: String(input.type ?? "").trim().slice(0, 100),
    size: String(input.size ?? "").trim().slice(0, 100),
    badge: String(input.badge ?? "").trim().slice(0, 80) || undefined,
    price: String(input.price ?? "").trim().slice(0, 80) || undefined,
    description: String(input.description ?? "").trim().slice(0, 1200),
    features: Array.isArray(input.features)
      ? input.features.map(String).map((item) => item.trim().slice(0, 120)).filter(Boolean).slice(0, 8)
      : [],
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
  if (!await requireAdminApi()) return Response.json({ error: "غير مصرح" }, { status: 403 });

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
