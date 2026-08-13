export const MAX_IMAGE_UPLOAD_BYTES = 4 * 1024 * 1024;

export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type SupportedImageMimeType = typeof SUPPORTED_IMAGE_MIME_TYPES[number];

const supportedImageTypes = new Set<string>(SUPPORTED_IMAGE_MIME_TYPES);

export function isSupportedImageMimeType(value: string): value is SupportedImageMimeType {
  return supportedImageTypes.has(value);
}

function matches(bytes: Uint8Array, expected: readonly number[], offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

export function detectImageMimeType(bytes: Uint8Array): SupportedImageMimeType | null {
  if (matches(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (
    matches(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
    || matches(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
  ) return "image/gif";
  if (
    matches(bytes, [0x52, 0x49, 0x46, 0x46])
    && matches(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  ) return "image/webp";
  return null;
}

export async function fileHasMatchingImageSignature(file: File) {
  return Boolean(await verifiedImageMimeType(file));
}

export async function verifiedImageMimeType(file: File): Promise<SupportedImageMimeType | null> {
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const detected = detectImageMimeType(signature);
  return detected && detected === file.type.toLowerCase() ? detected : null;
}
