import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/demo", "/privacy", "/install"],
        disallow: ["/dashboard", "/meetings", "/api", "/share", "/setup"],
      },
    ],
    sitemap: `${config.appUrl.replace(/\/+$/, "")}/sitemap.xml`,
  };
}
