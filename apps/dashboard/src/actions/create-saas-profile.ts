"use server";

import type z from "zod";
import { issueSignupEmailVerification } from "@school-clerk/auth/signup-email-verification";
import { createSchoolOwnerAccount } from "@school-clerk/auth/school-signup";
import { getSignupCompletionContext, prisma } from "@school-clerk/db";
import { normalizeInstitutionType } from "@school-clerk/utils/institution-config";
import { getInstitutionType, isInstitutionTypeEnabled } from "@/features/signup/institution-types";
import { buildDashboardTenantUrl, buildSchoolSiteUrl } from "@/features/signup/tenant-urls";
import { notifySignupCompletion, sendSignupWorkspaceEmail } from "@/features/signup/completion";
import type { SignupSetupStatus } from "@/features/signup/completion-types";
import { sendSignupVerificationEmail } from "@/features/signup/verification-email";
import { provisionSchoolVercelDomains } from "@/utils/domain";
import { actionClient } from "./safe-action";
import { createSignupSchema } from "./schema";

const signupSchema = createSignupSchema({});
export type SignupInput = z.infer<typeof signupSchema>;

export const createSaasProfileAction = actionClient
  .schema(signupSchema)
  .action(async ({ parsedInput: input }) => {
    const institutionType = getInstitutionType(input.institutionType);
    if (!institutionType || !isInstitutionTypeEnabled(input.institutionType)) {
      throw new Error("Choose an institution type released for self-service signup.");
    }
    const canonicalInstitutionType = normalizeInstitutionType(input.institutionType);
    if (!canonicalInstitutionType) throw new Error("Institution type is not configured for onboarding.");

    const domainName = input.domainName.trim().toLowerCase();
    const email = input.email.trim().toLowerCase();
    const onboardingPath = "/onboarding/welcome";
    // Resolve all handoff configuration before committing a new account.
    const dashboardUrl = buildDashboardTenantUrl(domainName);
    const siteUrl = buildSchoolSiteUrl(domainName);
    const onboardingUrl = buildDashboardTenantUrl(domainName, onboardingPath);
    const loginUrl = buildDashboardTenantUrl(domainName, "/login");
    const onboardingLoginUrl = new URL(loginUrl);
    onboardingLoginUrl.searchParams.set("email", email);
    onboardingLoginUrl.searchParams.set("return_to", onboardingPath);

    const school = await createSchoolOwnerAccount({ ...input, institutionType: canonicalInstitutionType });
    const scope = { schoolId: school.schoolId, accountId: school.accountId, userId: school.userId };
    const setupStatus: SignupSetupStatus = {
      domains: "not-requested", verificationEmail: "needs-attention",
      workspaceEmail: "needs-attention", notification: "needs-attention",
    };

    if (process.env.NODE_ENV === "production" && !new URL(siteUrl).hostname.endsWith(".localhost")) {
      try {
        await provisionSchoolVercelDomains({
          dashboardDomain: new URL(dashboardUrl).hostname,
          siteDomain: new URL(siteUrl).hostname,
          assertCurrent: async () => {
            const current = await getSignupCompletionContext(prisma, scope);
            if (!current || current.school.subDomain !== domainName) throw new Error("Signup scope changed.");
          },
        });
        setupStatus.domains = "submitted";
      } catch {
        setupStatus.domains = "needs-attention";
      }
    }

    try {
      const proof = await issueSignupEmailVerification({ userId: school.userId, schoolId: school.schoolId, email });
      setupStatus.verificationEmail = (await sendSignupVerificationEmail(proof)).status;
    } catch {
      setupStatus.verificationEmail = "needs-attention";
    }
    try {
      setupStatus.workspaceEmail = await sendSignupWorkspaceEmail(scope);
    } catch {
      setupStatus.workspaceEmail = "needs-attention";
    }
    try {
      setupStatus.notification = await notifySignupCompletion(scope);
    } catch {
      setupStatus.notification = "needs-attention";
    }

    return {
      email, institutionType: institutionType.label, loginUrl, onboardingUrl,
      onboardingLoginUrl: onboardingLoginUrl.toString(), schoolName: school.schoolName,
      subDomain: school.subDomain, siteUrl, workspaceUrl: dashboardUrl, setupStatus,
      devOnboardingUrl: process.env.NODE_ENV !== "production" ? onboardingUrl : null,
    };
  });
