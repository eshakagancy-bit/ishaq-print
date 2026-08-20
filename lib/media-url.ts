export const DEFAULT_SUPABASE_STORAGE_BUCKET = "site-media";
export const MEDIA_PROXY_PATH_PREFIX = "/api/media/";

const PREOPTIMIZED_IMAGE_EXTENSION = /\.(?:avif|webp)$/i;

export function isPreoptimizedImageSource(value: string) {
  const pathEnd = value.search(/[?#]/);
  const pathname = pathEnd === -1 ? value : value.slice(0, pathEnd);
  return PREOPTIMIZED_IMAGE_EXTENSION.test(pathname);
}

const optimizedLocalMedia: Readonly<Record<string, string>> = {
  "/hero/technology-solutions.png": "/hero/technology-solutions.webp",
  "/products/wf-c5390.png": "/products/wf-c5390.webp",
  "/products/wf-c879r.png": "/products/wf-c879r.webp",
};

const controlOrSeparator = /[\/\\\u0000-\u001f\u007f]/;

function hasUnsafePathValue(value: string) {
  return !value || value === "." || value.includes("..") || controlOrSeparator.test(value);
}

export function isSafeMediaPathSegment(segment: string) {
  if (hasUnsafePathValue(segment)) return false;

  // Next.js decodes route params, but checking nested encodings also rejects
  // values such as %252e%252e before they reach Supabase Storage.
  let candidate = segment;
  for (let index = 0; index < 8; index += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(candidate);
    } catch {
      return false;
    }
    if (decoded === candidate) return true;
    if (hasUnsafePathValue(decoded)) return false;
    candidate = decoded;
  }

  return false;
}

export function safeMediaStoragePath(segments: readonly string[]) {
  if (!segments.length || segments.some((segment) => !isSafeMediaPathSegment(segment))) return null;
  const path = segments.join("/");
  return path.length <= 2048 ? path : null;
}

export function decodeMediaStoragePath(encodedPath: string) {
  if (!encodedPath || encodedPath.length > 4096) return null;

  let segments: string[];
  try {
    segments = encodedPath.split("/").map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }

  return safeMediaStoragePath(segments);
}

export function mediaUrlFromStoragePath(path: string) {
  const segments = path.split("/");
  if (!safeMediaStoragePath(segments)) throw new Error("Invalid media storage path");
  return `${MEDIA_PROXY_PATH_PREFIX}${segments.map(encodeURIComponent).join("/")}`;
}

function rawUrlPathname(value: string) {
  if (value.includes("\\")) return null;
  const authority = /^[a-z][a-z\d+.-]*:\/\/[^/?#]*/i.exec(value);
  if (!authority) return null;

  const pathStart = authority[0].length;
  if (value[pathStart] !== "/") return "";
  const queryStart = value.indexOf("?", pathStart);
  const hashStart = value.indexOf("#", pathStart);
  const pathEnd = [queryStart, hashStart]
    .filter((index) => index !== -1)
    .reduce((earliest, index) => Math.min(earliest, index), value.length);
  return value.slice(pathStart, pathEnd);
}

export function supabasePublicMediaStoragePath(
  value: string,
  bucket = DEFAULT_SUPABASE_STORAGE_BUCKET,
  expectedOrigin?: string,
) {
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (
    url.protocol !== "https:"
    || url.port
    || !/^[a-z0-9-]+\.supabase\.co$/i.test(url.hostname)
  ) {
    return null;
  }
  if (expectedOrigin && url.origin !== expectedOrigin) return null;

  const pathname = rawUrlPathname(value);
  if (pathname === null) return null;
  const parts = pathname.split("/");

  let prefix: string[];
  try {
    prefix = parts.slice(0, 6).map((part) => decodeURIComponent(part));
  } catch {
    return null;
  }
  if (
    prefix[0] !== ""
    || prefix[1] !== "storage"
    || prefix[2] !== "v1"
    || prefix[3] !== "object"
    || prefix[4] !== "public"
    || prefix[5] !== bucket
  ) {
    return null;
  }

  return decodeMediaStoragePath(parts.slice(6).join("/"));
}

export function normalizeMediaUrl(value: string, bucket = DEFAULT_SUPABASE_STORAGE_BUCKET) {
  if (optimizedLocalMedia[value]) return optimizedLocalMedia[value];
  const storagePath = supabasePublicMediaStoragePath(value, bucket);
  return storagePath ? mediaUrlFromStoragePath(storagePath) : value;
}
