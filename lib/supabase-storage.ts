import { getSupabaseAdmin } from "./supabase-server";

const defaultBucket = "site-media";

type StorageContext = {
  bucket: string;
  publicPathPrefix: string;
  supabaseUrl: string;
};

function validBucketName(value: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,98}[a-zA-Z0-9]$/.test(value)) {
    throw new Error("اسم Supabase Storage bucket غير صالح");
  }
  return value;
}

function getStorageContext(): StorageContext {
  const rawUrl = process.env.SUPABASE_URL?.trim() ?? "";
  const bucket = validBucketName(process.env.SUPABASE_STORAGE_BUCKET?.trim() || defaultBucket);

  let supabaseUrl: string;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") throw new Error("invalid protocol");
    supabaseUrl = parsed.origin;
  } catch {
    throw new Error("SUPABASE_URL غير صالح");
  }

  return {
    bucket,
    publicPathPrefix: `/storage/v1/object/public/${bucket}/`,
    supabaseUrl,
  };
}

export async function uploadImage(file: File, folder: string) {
  const { bucket } = getStorageContext();
  const client = getSupabaseAdmin();
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "general";
  const extension = file.type.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  const path = `${safeFolder}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error } = await client.storage.from(bucket).upload(path, await file.arrayBuffer(), {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`تعذر رفع الصورة إلى Supabase: ${error.message}`);

  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function deleteImageByPublicUrl(publicUrl: string) {
  const { bucket, publicPathPrefix, supabaseUrl } = getStorageContext();
  const client = getSupabaseAdmin();

  let parsed: URL;
  try {
    parsed = new URL(publicUrl);
  } catch {
    return false;
  }

  if (parsed.origin !== supabaseUrl || !parsed.pathname.startsWith(publicPathPrefix)) return false;
  const encodedPath = parsed.pathname.slice(publicPathPrefix.length);
  let path: string;
  try {
    path = encodedPath.split("/").map(decodeURIComponent).join("/");
  } catch {
    return false;
  }
  if (!path || path.includes("..")) return false;

  const { error } = await client.storage.from(bucket).remove([path]);
  if (error) throw new Error(`تعذر حذف الصورة من Supabase: ${error.message}`);
  return true;
}
