import { headers } from "next/headers";
import type { MetadataRoute } from "next";
import {
  getTemplateById,
  resolveTemplateRoute,
  templateRegistry,
} from "@school-clerk/template-registry";
import { resolveHost } from "@/lib/tenant/resolve-host";
import { resolvePublicTenant } from "@/lib/tenant/resolve-public-tenant";
import { getPublicWebsiteData } from "@/lib/website/get-public-website-data";

function getBaseUrl(input: {
  host: string;
  subdomain?: string | null;
  customDomain?: string | null;
}) {
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  if (input.customDomain) return `https://${input.customDomain}`;

  if (process.env.NODE_ENV === "production") {
    const rootDomain =
      process.env.SCHOOL_SITE_ROOT_DOMAIN ??
      process.env.APP_ROOT_DOMAIN ??
      "school-clerk.com";
    const cleanRoot = rootDomain
      .replace(/^https?:\/\//, "")
      .replace(/^dashboard\./, "");
    return input.subdomain
      ? `${protocol}://${input.subdomain}.${cleanRoot}`
      : `${protocol}://${input.host}`;
  }

  return `${protocol}://${input.host}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headerStore = await headers();
  const host = resolveHost(headerStore.get("host"));
  const publicTenant = await resolvePublicTenant(host);

  if (!publicTenant) return [];

  const { tenant, config } = publicTenant;
  const template = getTemplateById(templateRegistry, config.templateId);
  const contentData = await getPublicWebsiteData(tenant, config, {
    includeFallback: publicTenant.source !== "database",
  });
  const baseUrl = getBaseUrl({
    host: headerStore.get("host") ?? host,
    subdomain: tenant.subdomain,
    customDomain: tenant.customDomain,
  });
  const staticPages = template.manifest.pages
    .filter((page) => !page.route.includes("["))
    .map((page) => ({
      url: `${baseUrl}${page.route === "/" ? "" : page.route}`,
      lastModified: new Date(),
    }));
  const dynamicPages = [
    ...contentData.blogPosts.map((item) => `/blog/${item.slug}`),
    ...contentData.events.map((item) => `/events/${item.slug}`),
    ...contentData.resources.map((item) => `/resources/${item.slug}`),
  ]
    .filter((pathname) => resolveTemplateRoute(template, pathname))
    .map((pathname) => ({
      url: `${baseUrl}${pathname}`,
      lastModified: new Date(),
    }));

  return [...staticPages, ...dynamicPages];
}
