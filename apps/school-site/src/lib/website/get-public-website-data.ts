import {
  createWebsiteContentDataFromConfig,
  type WebsiteTemplateContentData,
  type WebsiteTemplateConfiguration,
  type WebsiteTenantProfile,
} from "@school-clerk/template-registry";

export async function getPublicWebsiteData(
  tenant: WebsiteTenantProfile,
  config?: WebsiteTemplateConfiguration | null,
): Promise<WebsiteTemplateContentData> {
  return createWebsiteContentDataFromConfig(tenant, config);
}
