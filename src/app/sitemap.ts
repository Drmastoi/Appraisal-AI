import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Only public, indexable pages belong here. Sign-in and registration are
 * deliberately `noindex` (access is by invitation), and everything behind a
 * session or a single-use feedback token is excluded in robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
