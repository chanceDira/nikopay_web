import type { MetadataRoute } from "next";
import { resolvePublicSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const site = resolvePublicSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/app/", "/auth/", "/api/"],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
