import { ADMIN_UNAUTHORIZED_MESSAGE, requireAdminApi } from "../../admin-auth";
import {
  MAX_IMAGE_UPLOAD_BYTES,
  isSupportedImageMimeType,
  verifiedImageMimeType,
} from "../../../lib/image-file-validation";
import { deleteImageByPublicUrl, uploadImage } from "../../../lib/supabase-storage";
import { requiredString, safeWebOrLocalUrl, strictObject, validationResponse } from "../admin-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedFolders = new Set(["logos", "banners", "products", "general"]);

export async function POST(request: Request) {
  const admin = await requireAdminApi(request);
  if (!admin) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    const form = await request.formData();
    const unexpectedField = [...form.keys()].find((key) => key !== "file" && key !== "folder");
    if (unexpectedField) return Response.json({ error: `الحقل غير المتوقع: ${unexpectedField}` }, { status: 400 });
    if (form.getAll("file").length !== 1 || form.getAll("folder").length > 1) return Response.json({ error: "حقول الرفع مكررة" }, { status: 400 });
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "اختر صورة" }, { status: 400 });
    if (!file.size) return Response.json({ error: "ملف الصورة فارغ" }, { status: 400 });
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) return Response.json({ error: "حجم الصورة يجب ألا يتجاوز 4MB" }, { status: 400 });
    if (!isSupportedImageMimeType(file.type)) return Response.json({ error: "نوع الصورة غير مدعوم" }, { status: 400 });
    const verifiedMimeType = await verifiedImageMimeType(file);
    if (!verifiedMimeType) {
      return Response.json({ error: "محتوى الملف لا يطابق نوع الصورة" }, { status: 400 });
    }

    const requestedFolder = String(form.get("folder") ?? "general");
    if (!allowedFolders.has(requestedFolder)) {
      return Response.json({ error: "مجلد الرفع غير صالح" }, { status: 400 });
    }
    const uploaded = await uploadImage(file, requestedFolder, verifiedMimeType);
    return Response.json(uploaded, { status: 201 });
  } catch {
    return Response.json({ error: "تعذر رفع الصورة إلى مساحة التخزين" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdminApi(request);
  if (!admin) return Response.json({ error: ADMIN_UNAUTHORIZED_MESSAGE }, { status: 403 });

  try {
    const body = strictObject(await request.json(), ["url"], "طلب حذف الصورة");
    const url = requiredString(body.url, "رابط الصورة", 2000);
    safeWebOrLocalUrl(url, "رابط الصورة", 2000, false);

    const deleted = await deleteImageByPublicUrl(url);
    return Response.json({ deleted });
  } catch (error) {
    const invalid = validationResponse(error);
    if (invalid) return invalid;
    return Response.json({ error: "تعذر حذف الصورة من مساحة التخزين" }, { status: 500 });
  }
}
