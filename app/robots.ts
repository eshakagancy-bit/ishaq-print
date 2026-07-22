import type { MetadataRoute } from "next";

const SITE_URL = "https://ishaq-print-zeta.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/admin/", "/api/upload"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
