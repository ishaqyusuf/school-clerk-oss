import {
  getWebsiteConfigPreviewById,
  listWebsiteMediaAssetsBySchoolProfileId,
} from "@school-clerk/db";
import {
  getTemplateById,
  mockPublishedWebsiteConfig,
  mockTenantProfile,
  normalizeWebsiteTemplateConfigRecord,
  resolveWebsiteMediaConfig,
  templateRegistry,
  type WebsiteTemplateConfiguration,
  type WebsiteTenantProfile,
  verifyWebsitePreviewToken,
} from "@school-clerk/template-registry";

type PreviewResolution = {
  tenant: WebsiteTenantProfile;
  config: WebsiteTemplateConfiguration;
};

export async function resolvePreviewTenant(input: {
  configId: string;
  token: string;
}): Promise<PreviewResolution | null> {
  const record = await getWebsiteConfigPreviewById(input.configId);

  if (!record?.schoolProfile) return null;

  if (
    !verifyWebsitePreviewToken({
      configId: record.id,
      schoolProfileId: record.schoolProfileId,
      token: input.token,
    })
  ) {
    return null;
  }

  const mediaAssets = await listWebsiteMediaAssetsBySchoolProfileId(record.schoolProfileId);
  const template = getTemplateById(templateRegistry, record.templateId);

  const tenant: WebsiteTenantProfile = {
    schoolProfileId: record.schoolProfile.id,
    schoolName: record.schoolProfile.name,
    institutionType: mockTenantProfile.institutionType,
    subdomain: record.schoolProfile.subDomain,
    customDomain:
      record.schoolProfile.domains.find((domain) => domain.isPrimary)?.customDomain ??
      record.schoolProfile.domains.find((domain) => domain.customDomain)?.customDomain ??
      null,
  };

  const config = resolveWebsiteMediaConfig(
    normalizeWebsiteTemplateConfigRecord(
      template,
      record.schoolProfileId,
      record
    ),
    mediaAssets
  );

  return {
    tenant,
    config,
  };
}
