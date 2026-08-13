import type { SupportedImageMimeType } from "./image-file-validation";

const imageExtensions: Record<SupportedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function imageStoragePath(folder: string, mimeType: SupportedImageMimeType, uuid = crypto.randomUUID()) {
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "general";
  if (!/^[0-9a-f-]{36}$/i.test(uuid)) throw new Error("Invalid upload identifier");
  return `${safeFolder}/${uuid}.${imageExtensions[mimeType]}`;
}
