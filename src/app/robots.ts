import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Appraisal data is confidential: keep authenticated areas, the API and
        // single-use 360° feedback links out of every index.
        disallow: ["/api/", "/admin", "/admin/", "/doctor", "/doctor/", "/appraiser", "/appraiser/", "/feedback", "/feedback/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
