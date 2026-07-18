import { safeMediaStoragePath } from "../../../../lib/media-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mediaCacheControl = "public, max-age=86400, s-maxage=31536000";
const defaultBucket = "site-media";
const allowedMediaTypes = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);

function storageConfig() {
  const rawUrl = process.env.SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || defaultBucket;

  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,98}[a-zA-Z0-9]$/.test(bucket)) {
    throw new Error("Invalid Supabase Storage bucket");
  }

  let supabaseUrl: string;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") throw new Error("invalid protocol");
    supabaseUrl = parsed.origin;
  } catch {
    throw new Error("Invalid SUPABASE_URL");
  }

  return { bucket, serviceRoleKey, supabaseUrl };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await context.params;
  const storagePath = Array.isArray(pathSegments) ? safeMediaStoragePath(pathSegments) : null;
  if (!storagePath) {
    return Response.json({ error: "Invalid media path" }, {
      status: 400,
      headers: { "cache-control": "no-store" },
    });
  }

  try {
    const { bucket, serviceRoleKey, supabaseUrl } = storageConfig();
    const encodedPath = storagePath.split("/").map(encodeURIComponent).join("/");
    const upstreamUrl = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodedPath}`;
    const upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
      redirect: "manual",
      signal: request.signal,
    });

    if (!upstream.ok || !upstream.body) {
      return Response.json({ error: upstream.status === 404 ? "Media not found" : "Unable to load media" }, {
        status: upstream.status === 404 ? 404 : 502,
        headers: { "cache-control": "no-store" },
      });
    }

    const contentType = upstream.headers.get("content-type") || "";
    const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
    if (!allowedMediaTypes.has(mediaType)) {
      void upstream.body.cancel().catch(() => undefined);
      return Response.json({ error: "Unsupported media type" }, {
        status: 415,
        headers: { "cache-control": "no-store" },
      });
    }

    const headers = new Headers({
      "cache-control": mediaCacheControl,
      "content-security-policy": "default-src 'none'; sandbox",
      "content-type": contentType,
      "x-content-type-options": "nosniff",
    });
    const etag = upstream.headers.get("etag");
    if (etag) headers.set("etag", etag);

    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return Response.json({ error: "Media proxy is not configured" }, {
      status: 500,
      headers: { "cache-control": "no-store" },
    });
  }
}
