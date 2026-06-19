import { headers } from "next/headers";
import {
  renderPublicPage,
  resolvePublicPageMetadata,
  resolvePublicStructuredData,
} from "@/lib/website/render-public-page";
import { resolveHost } from "@/lib/tenant/resolve-host";
import { resolveTenantUrlContext } from "@school-clerk/tenant-url";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams?: Promise<{ preview?: string; token?: string; template?: string }>;
}): Promise<Metadata> {
  const resolvedSearchParams: Promise<{
    preview?: string;
    token?: string;
    template?: string;
  }> =
    searchParams ?? Promise.resolve({});
  const [{ slug }, previewQuery] = await Promise.all([
    params,
    resolvedSearchParams,
  ]);
  const headerStore = await headers();
  const { host, pathname } = resolvePublicRequestTarget({
    rawHost: headerStore.get("host"),
    slug,
  });

  return resolvePublicPageMetadata({
    host,
    pathname,
    previewConfigId: previewQuery.preview,
    previewToken: previewQuery.token,
    templateId: previewQuery.template,
  });
}

export default async function PublicSitePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams?: Promise<{ preview?: string; token?: string; template?: string }>;
}) {
  const resolvedSearchParams: Promise<{
    preview?: string;
    token?: string;
    template?: string;
  }> =
    searchParams ?? Promise.resolve({});
  const [{ slug }, previewQuery] = await Promise.all([
    params,
    resolvedSearchParams,
  ]);
  const headerStore = await headers();
  const { host, pathname } = resolvePublicRequestTarget({
    rawHost: headerStore.get("host"),
    slug,
  });
  const structuredData = await resolvePublicStructuredData({
    host,
    pathname,
    previewConfigId: previewQuery.preview,
    previewToken: previewQuery.token,
    templateId: previewQuery.template,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData),
        }}
      />
      {await renderPublicPage({
        host,
        pathname,
        previewConfigId: previewQuery.preview,
        previewToken: previewQuery.token,
        templateId: previewQuery.template,
      })}
    </>
  );
}

function resolvePublicRequestTarget({
  rawHost,
  slug,
}: {
  rawHost: string | null;
  slug?: string[];
}) {
  const pathname = `/${(slug ?? []).join("/")}`;

  if (process.env.NODE_ENV === "production") {
    return {
      host: resolveHost(rawHost),
      pathname,
    };
  }

  const context = resolveTenantUrlContext(
    {
      host: rawHost,
      pathname,
    },
    {
      internalPrefix: "/__school-site",
      appRootDomain:
        process.env.SCHOOL_SITE_ROOT_DOMAIN ??
        "school-clerk-site.localhost:1355",
      pathStyleHosts: ["localhost", "127.0.0.1", "0.0.0.0"],
      enablePathStyleHosts: true,
    },
  );

  if (context.style === "path" && context.tenantSlug) {
    return {
      host: context.tenantSlug,
      pathname: context.productPath,
    };
  }

  return {
    host: resolveHost(rawHost),
    pathname,
  };
}
