import {
  getWebsiteConfigPreviewById,
  listWebsiteMediaAssetsBySchoolProfileId,
} from "@school-clerk/db";
import {
  getTemplateById,
  normalizeWebsiteTemplateConfigRecord,
  resolveWebsiteMediaConfig,
  templateRegistry,
  type WebsiteTemplateConfiguration,
  type WebsiteInstitutionType,
  type WebsiteTenantProfile,
  verifyWebsitePreviewToken,
} from "@school-clerk/template-registry";

type PreviewResolution = {
  tenant: WebsiteTenantProfile;
  config: WebsiteTemplateConfiguration;
};

const WEBSITE_INSTITUTION_TYPES = new Set<WebsiteInstitutionType>([
  "PRESCHOOL",
  "PRIMARY",
  "SECONDARY",
  "K12",
  "COLLEGE",
  "POLYTECHNIC",
  "UNIVERSITY",
  "TRAINING_CENTER",
  "RELIGIOUS_SCHOOL",
]);

function normalizeInstitutionType(value?: string | null): WebsiteInstitutionType {
  const normalized = value?.trim().toUpperCase();

  if (
    normalized &&
    WEBSITE_INSTITUTION_TYPES.has(normalized as WebsiteInstitutionType)
  ) {
    return normalized as WebsiteInstitutionType;
  }

  return "K12";
}

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

  const mediaAssets = await listWebsiteMediaAssetsBySchoolProfileId(
    record.schoolProfileId,
  );
  const template = getTemplateById(templateRegistry, record.templateId);

  const tenant: WebsiteTenantProfile = {
    schoolProfileId: record.schoolProfile.id,
    schoolName: record.schoolProfile.name,
    institutionType: normalizeInstitutionType(
      record.schoolProfile.institutionType,
    ),
    subdomain: record.schoolProfile.subDomain,
    customDomain:
      record.schoolProfile.domains.find((domain) => domain.isPrimary)
        ?.customDomain ??
      record.schoolProfile.domains.find((domain) => domain.customDomain)
        ?.customDomain ??
      null,
  };

  const config = resolveWebsiteMediaConfig(
    normalizeWebsiteTemplateConfigRecord(
      template,
      record.schoolProfileId,
      record,
    ),
    mediaAssets,
  );

  return {
    tenant,
    config,
  };
}
