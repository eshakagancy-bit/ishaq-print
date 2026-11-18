import { getPublicSearchProducts } from "../../../lib/site-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    return Response.json(await getPublicSearchProducts(), { headers });
  } catch {
    return Response.json({ error: "تعذر تحميل البحث" }, { status: 503, headers });
  }
}
