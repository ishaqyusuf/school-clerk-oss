import {
  getTemplateById,
  mockPublishedWebsiteConfig,
  mockTenantProfile,
  renderTemplatePage,
  resolveTemplateRoute,
  templateRegistry,
  type WebsiteCollectionItem,
  type WebsiteTemplateConfiguration,
  type WebsiteTemplatePageKey,
  type WebsiteTemplateDefinition,
  type WebsiteTenantProfile,
} from "@school-clerk/template-registry";
import { notFound } from "next/navigation";
import { resolvePublicTenant } from "../tenant/resolve-public-tenant";
import { getPublicWebsiteData } from "./get-public-website-data";
import { resolvePreviewTenant } from "./preview";

type WebsiteRenderTarget = {
  tenant: WebsiteTenantProfile;
  config: WebsiteTemplateConfiguration;
  template: WebsiteTemplateDefinition;
  source: "database" | "mock" | "preview";
};

function canUseTemplateQuery() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.WEBSITE_ALLOW_PUBLIC_TEMPLATE_QUERY === "1"
  );
}

async function resolveWebsiteRenderTarget(input: {
  host: string;
  pathname: string;
  previewConfigId?: string | null;
  previewToken?: string | null;
  templateId?: string | null;
}): Promise<WebsiteRenderTarget | null> {
  if (input.templateId && canUseTemplateQuery()) {
    const template = getTemplateById(templateRegistry, input.templateId);
    const config: WebsiteTemplateConfiguration = {
      ...mockPublishedWebsiteConfig,
      templateId: template.manifest.id,
      themeConfig: template.manifest.defaultThemeConfig,
    };

    return {
      tenant: mockTenantProfile,
      config,
      template,
      source: "mock",
    };
  }

  if (input.previewConfigId && input.previewToken) {
    const preview = await resolvePreviewTenant({
      configId: input.previewConfigId,
      token: input.previewToken,
    });

    if (preview) {
      const template = getTemplateById(templateRegistry, preview.config.templateId);

      return {
        ...preview,
        template,
        source: "preview",
      };
    }
  }

  const publicTenant = await resolvePublicTenant(input.host);

  if (!publicTenant) return null;

  return {
    ...publicTenant,
    template: getTemplateById(templateRegistry, publicTenant.config.templateId),
    source: publicTenant.source,
  };
}

function getRouteCollectionItem(input: {
  pageKey: WebsiteTemplatePageKey;
  routeSlug: string | null;
  contentData: Awaited<ReturnType<typeof getPublicWebsiteData>>;
}): WebsiteCollectionItem | null {
  if (!input.routeSlug) return null;

  if (input.pageKey === "blog-post") {
    return (
      input.contentData.blogPosts.find((item) => item.slug === input.routeSlug) ??
      null
    );
  }

  if (input.pageKey === "event-post") {
    return (
      input.contentData.events.find((item) => item.slug === input.routeSlug) ??
      null
    );
  }

  if (input.pageKey === "resource-post") {
    return (
      input.contentData.resources.find((item) => item.slug === input.routeSlug) ??
      null
    );
  }

  return null;
}

function isDetailPage(pageKey: WebsiteTemplatePageKey) {
  return (
    pageKey === "blog-post" ||
    pageKey === "event-post" ||
    pageKey === "resource-post"
  );
}

function getPublicBaseUrl(input: {
  tenant: WebsiteRenderTarget["tenant"];
  protocol?: "http" | "https";
}) {
  if (input.tenant.customDomain) {
    return `https://${input.tenant.customDomain}`;
  }

  if (!input.tenant.subdomain) return undefined;

  const rootDomain =
    process.env.SCHOOL_SITE_ROOT_DOMAIN ??
    process.env.APP_ROOT_DOMAIN ??
    "school-clerk.com";
  const cleanRoot = rootDomain
    .replace(/^https?:\/\//, "")
    .replace(/^dashboard\./, "");
  const protocol =
    input.protocol ?? (process.env.NODE_ENV === "production" ? "https" : "http");

  return `${protocol}://${input.tenant.subdomain}.${cleanRoot}`;
}

export async function renderPublicPage(input: {
  host: string;
  pathname: string;
  previewConfigId?: string | null;
  previewToken?: string | null;
  templateId?: string | null;
}) {
  const target = await resolveWebsiteRenderTarget(input);

  if (!target) notFound();

  const { tenant, config, template } = target;
  const route = resolveTemplateRoute(template, input.pathname);

  if (!route) notFound();

  const contentData = await getPublicWebsiteData(tenant, config, {
    includeFallback: target.source !== "database",
  });
  const routeItem = getRouteCollectionItem({
    pageKey: route.pageKey,
    routeSlug: route.routeSlug,
    contentData,
  });

  if (isDetailPage(route.pageKey) && !routeItem) notFound();

  return renderTemplatePage(templateRegistry, {
    mode: "production",
    tenant,
    config,
    pageKey: route.pageKey,
    pathname: input.pathname,
    routeSlug: route.routeSlug,
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
  const target = await resolveWebsiteRenderTarget(input);

  if (!target) {
    return {
      title: "Website not found",
      description: "This school website is not available.",
    };
  }

  const { tenant, config, template } = target;
  const route = resolveTemplateRoute(template, input.pathname);

  if (!route) {
    return {
      title: "Website not found",
      description: "This school website page is not available.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const pageKey = route?.pageKey ?? "home";
  const contentData = await getPublicWebsiteData(tenant, config, {
    includeFallback: target.source !== "database",
  });
  const routeItem = getRouteCollectionItem({
    pageKey,
    routeSlug: route.routeSlug,
    contentData,
  });

  if (isDetailPage(pageKey) && !routeItem) {
    return {
      title: "Website not found",
      description: "This school website page is not available.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const publicBaseUrl = getPublicBaseUrl({ tenant });

  const pageTitle =
    (config.seoConfig?.[`pages.${pageKey}.title`] as string | undefined) ??
    routeItem?.title ??
    tenant.schoolName;

  const description =
    (config.seoConfig?.[`pages.${pageKey}.description`] as
      | string
      | undefined) ??
    (config.seoConfig?.siteDescription as string | undefined) ??
    routeItem?.excerpt ??
    `${tenant.schoolName} website`;

  const ogImage =
    (config.seoConfig?.[`pages.${pageKey}.ogImage`] as string | undefined) ??
    (config.seoConfig?.siteOgImage as string | undefined) ??
    routeItem?.imageUrl ??
    (config.content["home.hero.imageUrl"] as string | undefined);

  const canonical =
    (config.seoConfig?.[`pages.${pageKey}.canonicalUrl`] as
      | string
      | undefined) ??
    (publicBaseUrl ? `${publicBaseUrl}${input.pathname}` : undefined);

  return {
    title: pageTitle,
    description,
    keywords: [tenant.schoolName, "school website", "admissions", pageKey],
    metadataBase: publicBaseUrl ? new URL(publicBaseUrl) : undefined,
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
  const target = await resolveWebsiteRenderTarget(input);

  if (!target) return [];

  const { tenant, config, template } = target;
  const route = resolveTemplateRoute(template, input.pathname);
  if (!route) return [];

  const pageKey = route.pageKey;
  const contentData = await getPublicWebsiteData(tenant, config, {
    includeFallback: target.source !== "database",
  });
  const routeItem = getRouteCollectionItem({
    pageKey,
    routeSlug: route.routeSlug,
    contentData,
  });

  if (isDetailPage(pageKey) && !routeItem) return [];

  const publicBaseUrl = getPublicBaseUrl({ tenant });

  const url = publicBaseUrl ? `${publicBaseUrl}${input.pathname}` : undefined;

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
