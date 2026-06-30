import { prisma } from "@school-clerk/db";
import {
  type WebsiteInstitutionType,
  type WebsitePlan,
  type WebsiteTemplateDefinition,
} from "@school-clerk/template-registry";
import type { AuthCookie } from "@/actions/cookies/auth-cookie";

const WEBSITE_MANAGER_ROLES = new Set(["ADMIN", "Admin"]);
const WEBSITE_PLANS = new Set<WebsitePlan>([
  "BASIC",
  "PLUS",
  "PRO",
  "ENTERPRISE",
]);
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

export type WebsiteManagementContext = {
  schoolId: string;
  domain: string;
  userId: string;
  role: string | null;
  schoolName: string;
  institutionType: WebsiteInstitutionType;
  websitePlan: WebsitePlan;
};

function normalizeInstitutionType(value?: string | null): WebsiteInstitutionType {
  const normalized = value?.trim().toUpperCase();

  if (normalized && WEBSITE_INSTITUTION_TYPES.has(normalized as WebsiteInstitutionType)) {
    return normalized as WebsiteInstitutionType;
  }

  return "K12";
}

function getConfiguredWebsitePlan(): WebsitePlan {
  const configured = process.env.SCHOOL_CLERK_WEBSITE_PLAN?.trim().toUpperCase();
  return configured && WEBSITE_PLANS.has(configured as WebsitePlan)
    ? (configured as WebsitePlan)
    : "ENTERPRISE";
}

export async function getWebsiteManagementContext(
  cookie: AuthCookie | null | undefined,
): Promise<WebsiteManagementContext | null> {
  if (!cookie?.schoolId || !cookie.domain || !cookie.auth?.userId) {
    return null;
  }

  const [user, school] = await Promise.all([
    prisma.user.findUnique({
      where: { id: cookie.auth.userId },
      select: { role: true },
    }),
    prisma.schoolProfile.findUnique({
      where: { id: cookie.schoolId },
      select: {
        id: true,
        name: true,
        institutionType: true,
      },
    }),
  ]);

  if (!school) return null;

  return {
    schoolId: school.id,
    domain: cookie.domain,
    userId: cookie.auth.userId,
    role: user?.role ?? null,
    schoolName: school.name,
    institutionType: normalizeInstitutionType(school.institutionType),
    websitePlan: getConfiguredWebsitePlan(),
  };
}

export async function assertWebsiteManager(
  cookie: AuthCookie | null | undefined,
) {
  const context = await getWebsiteManagementContext(cookie);

  if (!context) {
    throw new Error("Tenant context not found for website management.");
  }

  if (!context.role || !WEBSITE_MANAGER_ROLES.has(context.role)) {
    throw new Error("You do not have permission to manage this website.");
  }

  return context;
}

export function isTemplateAvailableForContext(
  template: WebsiteTemplateDefinition,
  context: Pick<WebsiteManagementContext, "institutionType" | "websitePlan">,
) {
  return (
    template.manifest.institutionTypes.includes(context.institutionType) &&
    template.manifest.supportedPlans.includes(context.websitePlan)
  );
}

export function filterTemplatesForContext(
  templates: WebsiteTemplateDefinition[],
  context: Pick<WebsiteManagementContext, "institutionType" | "websitePlan">,
) {
  return templates.filter((template) =>
    isTemplateAvailableForContext(template, context),
  );
}

export function assertTemplateAvailableForContext(
  template: WebsiteTemplateDefinition,
  context: Pick<WebsiteManagementContext, "institutionType" | "websitePlan">,
) {
  if (!isTemplateAvailableForContext(template, context)) {
    throw new Error(
      "This template is not available for the current institution type or website plan.",
    );
  }
}
