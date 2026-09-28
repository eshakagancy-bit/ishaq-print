import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo-constants.js";

export default function robots(): MetadataRoute.Robots {
  const publicRules = {
    allow: "/",
    disallow: ["/admin", "/api/admin/", "/api/upload"],
  };

  return {
    rules: [
      { userAgent: "Googlebot", ...publicRules },
      { userAgent: "Bingbot", ...publicRules },
      { userAgent: "OAI-SearchBot", ...publicRules },
      { userAgent: "GPTBot", ...publicRules },
      { userAgent: "*", ...publicRules },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
