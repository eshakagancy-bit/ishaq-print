import { requireAdminApi } from "../../admin-auth";
import { deleteImageByPublicUrl, uploadImage } from "../../../lib/supabase-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const allowedFolders = new Set(["logos", "banners", "products", "general"]);

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "غير مصرح" }, { status: 403 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "اختر صورة" }, { status: 400 });
    if (!allowedTypes.has(file.type)) return Response.json({ error: "نوع الصورة غير مدعوم" }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return Response.json({ error: "حجم الصورة يجب ألا يتجاوز 4MB" }, { status: 400 });

    const requestedFolder = String(form.get("folder") ?? "general");
    const folder = allowedFolders.has(requestedFolder) ? requestedFolder : "general";
    const uploaded = await uploadImage(file, folder);
    return Response.json(uploaded, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر رفع الصورة" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "غير مصرح" }, { status: 403 });

  try {
    const body = await request.json() as { url?: unknown };
    const url = typeof body.url === "string" ? body.url.slice(0, 2000) : "";
    if (!url) return Response.json({ error: "رابط الصورة مطلوب" }, { status: 400 });

    const deleted = await deleteImageByPublicUrl(url);
    return Response.json({ deleted });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "تعذر حذف الصورة" }, { status: 500 });
  }
}
