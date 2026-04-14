import type { MetadataRoute } from "next";

const STATIC_PUBLIC_ROUTES = [
  "",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/cookies",
  "/kontakt",
  "/suche",
] as const;

function getBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const now = new Date();

  return STATIC_PUBLIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
