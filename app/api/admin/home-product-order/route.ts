import { getSiteData, saveHomeProductOrder } from "../../../../lib/site-database";
import { revalidatePath } from "next/cache";
import {
  HOME_PRODUCT_CATEGORIES,
  isHomeProductCategory,
  type HomeProductOrderItem,
} from "../../../home-product-order";
import { ADMIN_UNAUTHORIZED_MESSAGE, requireAdminApi } from "../../../admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeOrderItems(value: unknown): HomeProductOrderItem[] | null {
  if (!Array.isArray(value) || value.length > 2_000) return null;
  const items: HomeProductOrderItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const input = entry as Record<string, unknown>;
    const id = Number(input.id);
    const category = String(input.category ?? "");
    const homeDisplayOrder = Number(input.homeDisplayOrder);
    if (!Number.isSafeInteger(id) || id <= 0 || !isHomeProductCategory(category)
      || !Number.isSafeInteger(homeDisplayOrder) || homeDisplayOrder < 0) return null;
    items.push({ id, category, homeDisplayOrder });
  }
  return items;
}

function isCompleteOrder(items: HomeProductOrderItem[], currentProducts: Awaited<ReturnType<typeof getSiteData>>["products"]) {
  const current = currentProducts.filter((product) => isHomeProductCategory(product.category));
  if (items.length !== current.length || new Set(items.map((item) => item.id)).size !== items.length) return false;
  const currentById = new Map(current.map((product) => [product.id, product.category]));
  if (items.some((item) => currentById.get(item.id) !== item.category)) return false;

  return HOME_PRODUCT_CATEGORIES.every((category) => {
    const orders = items.filter((item) => item.category === category)
      .map((item) => item.homeDisplayOrder)
      .sort((left, right) => left - right);
    return orders.every((order, index) => order === index);
  });
}

export async function PUT(request: Request) {
  if (!await requireAdminApi()) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    const payload = await request.json() as { orders?: unknown };
    const items = normalizeOrderItems(payload.orders);
    if (!items) return Response.json({ error: "بيانات ترتيب الواجهة الرئيسية غير صالحة" }, { status: 400 });

    const currentData = await getSiteData();
    if (!isCompleteOrder(items, currentData.products)) {
      return Response.json({ error: "يجب إرسال جميع منتجات الأقسام بترتيب متصل ومن دون تكرار" }, { status: 400 });
    }

    const products = await saveHomeProductOrder(items);
    revalidatePath("/");
    return Response.json({ ok: true, products });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "تعذر حفظ ترتيب الواجهة الرئيسية",
    }, { status: 500 });
  }
}
