import { saveHeroSettings } from "../../../../lib/site-database";
import { requireAdminApi } from "../../../admin-auth";
import { normalizeHeroSettingsInput } from "../hero-slides/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  if (!await requireAdminApi()) return Response.json({ error: "غير مصرح" }, { status: 403 });

  try {
    const settings = await saveHeroSettings(normalizeHeroSettingsInput(await request.json()));
    return Response.json({ ok: true, settings });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر حفظ إعدادات البانر" }, { status: 400 });
  }
}
