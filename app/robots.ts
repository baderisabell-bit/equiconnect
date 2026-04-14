import type { MetadataRoute } from "next";

function getBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/dashboard/",
        "/analytics/",
        "/api/",
        "/login",
        "/registrieren",
        "/nachrichten/",
        "/merkliste/",
        "/einstellungen/",
        "/benachrichtigungen/",
        "/passwort-vergessen",
        "/passwort-zuruecksetzen",
        "/leistung-bestaetigen/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
