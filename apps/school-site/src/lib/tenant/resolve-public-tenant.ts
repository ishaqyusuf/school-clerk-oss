import {
  getPublishedWebsiteConfigBySchoolProfileId,
  listWebsiteMediaAssetsBySchoolProfileId,
  resolveSchoolProfileByHost,
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
} from "@school-clerk/template-registry";

type PublicTenantResolution = {
  tenant: WebsiteTenantProfile;
  config: WebsiteTemplateConfiguration;
  source: "database" | "mock";
};

export async function resolvePublicTenant(
  host: string
): Promise<PublicTenantResolution> {
  const school = await resolveSchoolProfileByHost(host);

  if (!school) {
    return {
      tenant: {
        ...mockTenantProfile,
        customDomain:
          host !== "localhost" && !host.endsWith(".localhost") ? host : null,
      },
      config: mockPublishedWebsiteConfig,
      source: "mock",
    };
  }

  const [published, mediaAssets] = await Promise.all([
    getPublishedWebsiteConfigBySchoolProfileId(school.id),
    listWebsiteMediaAssetsBySchoolProfileId(school.id),
  ]);

  if (!published?.websiteConfig) {
    return {
      tenant: {
        schoolProfileId: school.id,
        schoolName: school.name,
        institutionType: mockTenantProfile.institutionType,
        subdomain: school.subDomain,
        customDomain:
          school.domains.find((domain) => domain.isPrimary)?.customDomain ??
          school.domains.find((domain) => domain.customDomain)?.customDomain ??
          null,
      },
      config: {
        ...mockPublishedWebsiteConfig,
        tenantId: school.id,
      },
      source: "mock",
    };
  }

  const template = getTemplateById(
    templateRegistry,
    published.websiteConfig.templateId
  );

  return {
    tenant: {
      schoolProfileId: school.id,
      schoolName: school.name,
      institutionType: mockTenantProfile.institutionType,
      subdomain: school.subDomain,
      customDomain:
        school.domains.find((domain) => domain.isPrimary)?.customDomain ??
        school.domains.find((domain) => domain.customDomain)?.customDomain ??
        null,
    },
    config: resolveWebsiteMediaConfig(
      normalizeWebsiteTemplateConfigRecord(
        template,
        school.id,
        published.websiteConfig
      ),
      mediaAssets
    ),
    source: "database",
  };
}
