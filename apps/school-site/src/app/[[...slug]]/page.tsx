import { headers } from "next/headers";
import {
  renderPublicPage,
  resolvePublicPageMetadata,
  resolvePublicStructuredData,
} from "@/lib/website/render-public-page";
import { resolveHost } from "@/lib/tenant/resolve-host";
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
  const host = resolveHost(headerStore.get("host"));
  const pathname = `/${(slug ?? []).join("/")}`;

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
  const host = resolveHost(headerStore.get("host"));
  const pathname = `/${(slug ?? []).join("/")}`;
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
