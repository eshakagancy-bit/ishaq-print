import { getSupabaseAdmin } from "./supabase-server";
import {
  MEDIA_PROXY_PATH_PREFIX,
  decodeMediaStoragePath,
  mediaUrlFromStoragePath,
  supabasePublicMediaStoragePath,
} from "./media-url";

const defaultBucket = "site-media";

type StorageContext = {
  bucket: string;
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

  return { path, url: mediaUrlFromStoragePath(path) };
}

export async function deleteImageByPublicUrl(publicUrl: string) {
  const { bucket, supabaseUrl } = getStorageContext();
  const client = getSupabaseAdmin();

  const value = publicUrl.trim();
  let path: string | null;
  if (value.startsWith(MEDIA_PROXY_PATH_PREFIX)) {
    const queryIndex = value.search(/[?#]/);
    const pathname = queryIndex === -1 ? value : value.slice(0, queryIndex);
    path = decodeMediaStoragePath(pathname.slice(MEDIA_PROXY_PATH_PREFIX.length));
  } else {
    path = supabasePublicMediaStoragePath(value, bucket, supabaseUrl);
  }

  if (!path) return false;

  const { error } = await client.storage.from(bucket).remove([path]);
  if (error) throw new Error(`تعذر حذف الصورة من Supabase: ${error.message}`);
  return true;
}
