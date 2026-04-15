import {
  getTemplateById,
  mockPublishedWebsiteConfig,
  mockTenantProfile,
  renderTemplatePage,
  resolvePageKey,
  resolveRouteSlug,
  templateRegistry,
  type WebsiteCollectionItem,
  type WebsiteTemplateConfiguration,
  type WebsiteTemplatePageKey,
} from "@school-clerk/template-registry";
import { resolvePublicTenant } from "../tenant/resolve-public-tenant";
import { getPublicWebsiteData } from "./get-public-website-data";
import { resolvePreviewTenant } from "./preview";

async function resolveWebsiteRenderTarget(input: {
  host: string;
  pathname: string;
  previewConfigId?: string | null;
  previewToken?: string | null;
  templateId?: string | null;
}) {
  if (input.templateId) {
    const template = getTemplateById(templateRegistry, input.templateId);
    const config: WebsiteTemplateConfiguration = {
      ...mockPublishedWebsiteConfig,
      templateId: template.manifest.id,
      themeConfig: template.manifest.defaultThemeConfig,
    };

    return {
      tenant: mockTenantProfile,
      config,
    };
  }

  if (input.previewConfigId && input.previewToken) {
    const preview = await resolvePreviewTenant({
      configId: input.previewConfigId,
      token: input.previewToken,
    });

    if (preview) {
      return preview;
    }
  }

  return resolvePublicTenant(input.host);
}

function getRouteCollectionItem(input: {
  routeSlug: string | null;
  contentData: Awaited<ReturnType<typeof getPublicWebsiteData>>;
}): WebsiteCollectionItem | null {
  if (!input.routeSlug) return null;

  return (
    input.contentData.blogPosts.find((item) => item.slug === input.routeSlug) ??
    input.contentData.events.find((item) => item.slug === input.routeSlug) ??
    input.contentData.resources.find((item) => item.slug === input.routeSlug) ??
    null
  );
}

export async function renderPublicPage(input: {
  host: string;
  pathname: string;
  previewConfigId?: string | null;
  previewToken?: string | null;
  templateId?: string | null;
}) {
  const { tenant, config } = await resolveWebsiteRenderTarget(input);
  const pageKey: WebsiteTemplatePageKey = resolvePageKey(input.pathname);
  const routeSlug = resolveRouteSlug(input.pathname);
  const contentData = await getPublicWebsiteData(tenant);

  return renderTemplatePage(templateRegistry, {
    mode: "production",
    tenant,
    config,
    pageKey,
    pathname: input.pathname,
    routeSlug,
    contentData,
  });
}

export async function resolvePublicPageMetadata(input: {
  host: string;
  pathname: string;
  previewConfigId?: string | null;
  previewToken?: string | null;
  templateId?: string | null;
}) {
  const { tenant, config } = await resolveWebsiteRenderTarget(input);
  const pageKey = resolvePageKey(input.pathname);
  const routeSlug = resolveRouteSlug(input.pathname);
  const contentData = await getPublicWebsiteData(tenant);
  const routeItem = getRouteCollectionItem({ routeSlug, contentData });

  const pageTitle =
    (config.seoConfig?.[`pages.${pageKey}.title`] as string | undefined) ??
    routeItem?.title ??
    tenant.schoolName;

  const description =
    (config.seoConfig?.[`pages.${pageKey}.description`] as string | undefined) ??
    (config.seoConfig?.siteDescription as string | undefined) ??
    routeItem?.excerpt ??
    `${tenant.schoolName} website`;

  const ogImage =
    (config.seoConfig?.[`pages.${pageKey}.ogImage`] as string | undefined) ??
    (config.seoConfig?.siteOgImage as string | undefined) ??
    routeItem?.imageUrl ??
    (config.content["home.hero.imageUrl"] as string | undefined);

  const canonical =
    (config.seoConfig?.[`pages.${pageKey}.canonicalUrl`] as string | undefined) ??
    (tenant.customDomain
      ? `https://${tenant.customDomain}${input.pathname}`
      : tenant.subdomain
        ? `https://${tenant.subdomain}${input.pathname}`
        : undefined);

  return {
    title: pageTitle,
    description,
    keywords: [tenant.schoolName, "school website", "admissions", pageKey],
    metadataBase: tenant.customDomain
      ? new URL(`https://${tenant.customDomain}`)
      : tenant.subdomain
        ? new URL(`https://${tenant.subdomain}`)
        : undefined,
    openGraph: {
      title: pageTitle,
      description,
      images: ogImage ? [ogImage] : [],
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: pageTitle,
      description,
      images: ogImage ? [ogImage] : [],
    },
    alternates: canonical
      ? {
          canonical,
        }
      : undefined,
  };
}

export async function resolvePublicStructuredData(input: {
  host: string;
  pathname: string;
  previewConfigId?: string | null;
  previewToken?: string | null;
  templateId?: string | null;
}) {
  const { tenant } = await resolveWebsiteRenderTarget(input);
  const pageKey = resolvePageKey(input.pathname);
  const routeSlug = resolveRouteSlug(input.pathname);
  const contentData = await getPublicWebsiteData(tenant);
  const routeItem = getRouteCollectionItem({ routeSlug, contentData });

  const url =
    tenant.customDomain
      ? `https://${tenant.customDomain}${input.pathname}`
      : tenant.subdomain
        ? `https://${tenant.subdomain}${input.pathname}`
        : undefined;

  const organization = {
    "@context": "https://schema.org",
    "@type": "School",
    name: tenant.schoolName,
    url,
  };

  if (!routeItem) {
    return [organization];
  }

  const detailSchemaType =
    pageKey === "blog-post"
      ? "Article"
      : pageKey === "event-post"
        ? "Event"
        : "CreativeWork";

  return [
    organization,
    {
      "@context": "https://schema.org",
      "@type": detailSchemaType,
      headline: routeItem.title,
      description: routeItem.excerpt,
      image: routeItem.imageUrl ? [routeItem.imageUrl] : undefined,
      url,
      ...(detailSchemaType === "Event"
        ? { startDate: routeItem.publishedAt }
        : { datePublished: routeItem.publishedAt }),
    },
  ];
}
