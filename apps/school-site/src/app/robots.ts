import { headers } from "next/headers";
import type { MetadataRoute } from "next";

function normalizeHeaderHost(host?: string | null) {
  return (host ?? "localhost").toLowerCase();
}

function getBaseUrl(host: string) {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://${host}`;
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headerStore = await headers();
  const host = normalizeHeaderHost(headerStore.get("host"));

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/?preview=", "/?token=", "/?template="],
    },
    sitemap: `${getBaseUrl(host)}/sitemap.xml`,
  };
}
