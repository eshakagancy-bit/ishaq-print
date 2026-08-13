import { getSiteData, saveHomeProductOrder } from "../../../../lib/site-database";
import { revalidatePath } from "next/cache";
import {
  HOME_PRODUCT_CATEGORIES,
  isHomeProductCategory,
  type HomeProductOrderItem,
} from "../../../home-product-order";
import { ADMIN_UNAUTHORIZED_MESSAGE, requireAdminApi } from "../../../admin-auth";
import { strictObject, validationResponse } from "../../admin-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeOrderItems(value: unknown): HomeProductOrderItem[] | null {
  if (!Array.isArray(value) || value.length > 2_000) return null;
  const items: HomeProductOrderItem[] = [];
  for (const entry of value) {
    const input = strictObject(entry, ["id", "category", "homeDisplayOrder"], "عنصر ترتيب المنتجات");
    const id = input.id;
    const category = input.category;
    const homeDisplayOrder = input.homeDisplayOrder;
    if (typeof id !== "number" || !Number.isSafeInteger(id) || id <= 0
      || typeof category !== "string" || !isHomeProductCategory(category)
      || typeof homeDisplayOrder !== "number" || !Number.isSafeInteger(homeDisplayOrder) || homeDisplayOrder < 0) return null;
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
  if (!await requireAdminApi(request)) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    const payload = strictObject(await request.json(), ["orders"], "طلب ترتيب المنتجات");
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
    const invalid = validationResponse(error);
    if (invalid) return invalid;
    return Response.json({
      error: error instanceof Error ? error.message : "تعذر حفظ ترتيب الواجهة الرئيسية",
    }, { status: 500 });
  }
}
