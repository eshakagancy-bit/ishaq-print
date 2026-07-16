import { removeHeroSlide, updateHeroSlide } from "../../../../../lib/site-database";
import { requireAdminApi } from "../../../../admin-auth";
import { normalizeHeroSlideInput } from "../validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("رقم الشريحة غير صالح");
  return id;
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdminApi()) return Response.json({ error: "غير مصرح" }, { status: 403 });

  try {
    const { id: idParam } = await context.params;
    const slide = await updateHeroSlide(parseId(idParam), normalizeHeroSlideInput(await request.json()));
    if (!slide) return Response.json({ error: "الشريحة غير موجودة" }, { status: 404 });
    return Response.json({ ok: true, slide });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تعديل الشريحة" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdminApi()) return Response.json({ error: "غير مصرح" }, { status: 403 });

  try {
    const { id: idParam } = await context.params;
    const deleted = await removeHeroSlide(parseId(idParam));
    if (!deleted) return Response.json({ error: "الشريحة غير موجودة" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر حذف الشريحة" }, { status: 400 });
  }
}
