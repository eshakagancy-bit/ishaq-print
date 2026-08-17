import { createHeroSlide, getHeroData } from "../../../../lib/site-database";
import { ADMIN_UNAUTHORIZED_MESSAGE, requireAdminApi } from "../../../admin-auth";
import { validationResponse } from "../../admin-validation";
import { normalizeHeroSlideInput } from "./validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!await requireAdminApi()) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    return Response.json(await getHeroData(false));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر تحميل بيانات البانر" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!await requireAdminApi(request)) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    const slide = await createHeroSlide(normalizeHeroSlideInput(await request.json(), "create"));
    return Response.json({ ok: true, slide }, { status: 201 });
  } catch (error) {
    const invalid = validationResponse(error);
    if (invalid) return invalid;
    console.error("Hero slide insert failed", error);
    return Response.json({ error: "تعذر حفظ الشريحة الجديدة. حاول مرة أخرى." }, { status: 500 });
  }
}
