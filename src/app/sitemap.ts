import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Public, indexable routes. Auth-gated and admin routes are intentionally
// excluded (they are covered by robots disallow rules).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority?: number; changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/login", priority: 0.4 },
    { path: "/signup", priority: 0.5 },
    { path: "/reset-password", priority: 0.3 },
    { path: "/privacy", priority: 0.3, changeFrequency: "monthly" },
    { path: "/privacy/gdpr", priority: 0.2, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
    { path: "/cookies", priority: 0.2, changeFrequency: "monthly" },
  ];
  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency ?? "monthly",
    priority: route.priority ?? 0.5,
  }));
}
