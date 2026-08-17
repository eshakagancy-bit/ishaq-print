import { removeHeroSlide, updateHeroSlide } from "../../../../../lib/site-database";
import { ADMIN_UNAUTHORIZED_MESSAGE, requireAdminApi } from "../../../../admin-auth";
import { validationResponse } from "../../../admin-validation";
import { normalizeHeroSlideInput } from "../validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("رقم الشريحة غير صالح");
  return id;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdminApi(request)) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    const { id: idParam } = await context.params;
    const id = parseId(idParam);
    const slide = await updateHeroSlide(id, normalizeHeroSlideInput(await request.json(), id));
    if (!slide) return Response.json({ error: "الشريحة غير موجودة" }, { status: 404 });
    return Response.json({ ok: true, slide });
  } catch (error) {
    const invalid = validationResponse(error);
    if (invalid) return invalid;
    console.error("Hero slide update failed", error);
    return Response.json({ error: "تعذر حفظ تعديل الشريحة. حاول مرة أخرى." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdminApi(request)) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    const { id: idParam } = await context.params;
    const deleted = await removeHeroSlide(parseId(idParam));
    if (!deleted) return Response.json({ error: "الشريحة غير موجودة" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    const invalid = validationResponse(error);
    if (invalid) return invalid;
    console.error("Hero slide delete failed", error);
    return Response.json({ error: "تعذر حذف الشريحة. حاول مرة أخرى." }, { status: 500 });
  }
}
