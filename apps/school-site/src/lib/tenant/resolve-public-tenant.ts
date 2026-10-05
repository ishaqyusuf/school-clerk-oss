import { normalizeInstitutionType as normalizeCanonicalInstitutionType } from "@school-clerk/utils/institution-config";
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
  type WebsiteInstitutionType,
  type WebsiteTenantProfile,
} from "@school-clerk/template-registry";

type PublicTenantResolution = {
  tenant: WebsiteTenantProfile;
  config: WebsiteTemplateConfiguration;
  source: "database" | "mock";
};

function normalizeInstitutionType(value?: string | null): WebsiteInstitutionType {
  // Public rendering retains its historical K12 fallback without rewriting
  // unknown stored classifications. Settings exposes those values as unclassified.
  return normalizeCanonicalInstitutionType(value) ?? "K12";
}

export async function resolvePublicTenant(
  host: string
): Promise<PublicTenantResolution | null> {
  const school = await resolveSchoolProfileByHost(host);

  if (!school) {
    if (process.env.NODE_ENV === "production") return null;

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
    if (process.env.NODE_ENV === "production") return null;

    return {
      tenant: {
        schoolProfileId: school.id,
        schoolName: school.name,
        institutionType: normalizeInstitutionType(school.institutionType),
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
      institutionType: normalizeInstitutionType(school.institutionType),
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
