import {
  createMockWebsiteContentData,
  type WebsiteTemplateContentData,
  type WebsiteTenantProfile,
} from "@school-clerk/template-registry";

export async function getPublicWebsiteData(
  tenant: WebsiteTenantProfile
): Promise<WebsiteTemplateContentData> {
  return createMockWebsiteContentData(tenant);
}
