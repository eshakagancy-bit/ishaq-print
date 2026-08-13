import {
  applyPaperSpecificationsUpdate,
  getPaperSpecificationsUpdatePreview,
} from "../../../../lib/site-database";
import { ADMIN_UNAUTHORIZED_MESSAGE, requireAdminApi } from "../../../admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!await requireAdminApi()) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    return Response.json({ ok: true, preview: await getPaperSpecificationsUpdatePreview() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "تعذر معاينة تحديث مواصفات الأوراق" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  if (!await requireAdminApi(request)) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    if ((await request.text()).trim()) return Response.json({ error: "هذا الطلب لا يقبل بيانات" }, { status: 400 });
    return Response.json(await applyPaperSpecificationsUpdate());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "تعذر تحديث مواصفات الأوراق" },
      { status: 400 },
    );
  }
}
