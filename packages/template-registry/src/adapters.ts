import { createMockWebsiteContentData } from "./content-data";
import { mockPublishedWebsiteConfig, mockTenantProfile } from "./mock";
import type {
  WebsiteTemplateConfiguration,
  WebsiteTemplateContentData,
  WebsiteTemplateDefinition,
  WebsiteTemplateMode,
  WebsiteTemplatePageKey,
  WebsiteTemplateRenderContext,
  WebsiteTenantProfile,
} from "./types";

type WebsiteRenderContextInput = {
  template: WebsiteTemplateDefinition;
  tenant?: WebsiteTenantProfile;
  config?: WebsiteTemplateConfiguration;
  pageKey?: WebsiteTemplatePageKey;
  mode?: WebsiteTemplateMode;
  pathname?: string;
  routeSlug?: string | null;
  contentData?: WebsiteTemplateContentData;
};

export function createWebsiteRenderContext({
  template,
  tenant = mockTenantProfile,
  config,
  pageKey = "home",
  mode = "dummy",
  pathname,
  routeSlug = null,
  contentData,
}: WebsiteRenderContextInput): WebsiteTemplateRenderContext {
  return {
    mode,
    tenant,
    config: {
      ...mockPublishedWebsiteConfig,
      tenantId: tenant.schoolProfileId,
      templateId: template.manifest.id,
      themeConfig: template.manifest.defaultThemeConfig,
      ...(config ?? {}),
    },
    pageKey,
    pathname:
      pathname ?? template.manifest.pages.find((page) => page.key === pageKey)?.route,
    routeSlug,
    contentData: contentData ?? createMockWebsiteContentData(tenant),
  };
}

export function createDummyWebsiteRenderContext(
  template: WebsiteTemplateDefinition,
  input: Omit<WebsiteRenderContextInput, "template" | "mode"> = {}
) {
  return createWebsiteRenderContext({
    template,
    mode: "dummy",
    ...input,
  });
}

export function createProductionWebsiteRenderContext(
  template: WebsiteTemplateDefinition,
  input: Omit<WebsiteRenderContextInput, "template" | "mode">
) {
  return createWebsiteRenderContext({
    template,
    mode: "production",
    ...input,
  });
}
