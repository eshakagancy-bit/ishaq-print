import { getHeroData } from "../../../lib/site-database";
import { defaultHeroSettings, defaultHeroSlides } from "../../site-defaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getHeroData(true);
    return Response.json(data, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({
      slides: defaultHeroSlides,
      settings: defaultHeroSettings,
      error: "تعذر تحميل شرائح البانر",
    }, { headers: { "cache-control": "no-store" } });
  }
}
