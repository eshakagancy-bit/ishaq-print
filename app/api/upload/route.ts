import { requireAdminApi } from "../../admin-auth";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  fileHasMatchingImageSignature,
  isSupportedImageMimeType,
} from "../../../lib/image-file-validation";
import { deleteImageByPublicUrl, uploadImage } from "../../../lib/supabase-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedFolders = new Set(["logos", "banners", "products", "general"]);

export async function POST(request: Request) {
  const admin = await requireAdminApi();
  if (!admin) return Response.json({ error: "غير مصرح" }, { status: 403 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "اختر صورة" }, { status: 400 });
    if (!file.size) return Response.json({ error: "ملف الصورة فارغ" }, { status: 400 });
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) return Response.json({ error: "حجم الصورة يجب ألا يتجاوز 4MB" }, { status: 400 });
    if (!isSupportedImageMimeType(file.type)) return Response.json({ error: "نوع الصورة غير مدعوم" }, { status: 400 });
    if (!await fileHasMatchingImageSignature(file)) {
      return Response.json({ error: "محتوى الملف لا يطابق نوع الصورة" }, { status: 400 });
    }

    const requestedFolder = String(form.get("folder") ?? "general");
    if (!allowedFolders.has(requestedFolder)) {
      return Response.json({ error: "مجلد الرفع غير صالح" }, { status: 400 });
    }
    const uploaded = await uploadImage(file, requestedFolder);
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
