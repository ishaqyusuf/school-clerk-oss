"use server";

import type z from "zod";
import { headers } from "next/headers";

import { ensureNotificationContact, prisma } from "@school-clerk/db";
import { createNotificationFromType } from "@school-clerk/notifications";
import { getRecipient, slugify } from "@school-clerk/utils";

import { auth } from "@/auth/server";
import {
  buildDashboardTenantUrl,
  buildSchoolSiteUrl,
} from "@/features/signup/tenant-urls";
import {
  getInstitutionType,
  isInstitutionTypeEnabled,
} from "@/features/signup/institution-types";
import { provisionSchoolVercelDomains } from "@/utils/domain";
import { actionClient } from "./safe-action";
import { createSignupSchema } from "./schema";

const signupSchema = createSignupSchema({});
export type SignupInput = z.infer<typeof signupSchema>;

const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "api",
  "app",
  "dashboard",
  "demo",
  "docs",
  "help",
  "login",
  "school-clerk",
  "school-clerk-dashboard",
  "sign-in",
  "sign-up",
  "staff",
  "support",
  "www",
]);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeSubdomain(value: string) {
  return value.trim().toLowerCase();
}

function parseStudentCount(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized) return null;

  const digits = normalized.replace(/[^\d]/g, "");
  if (!digits) return null;

  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function sendSignupSuccessEmail({
  to,
  schoolName,
  onboardingUrl,
  siteUrl,
  workspaceUrl,
}: {
  to: string;
  schoolName: string;
  onboardingUrl: string;
  siteUrl: string;
  workspaceUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ??
    "School Clerk <noreply@school-clerk.com>";

  if (!apiKey) {
    console.warn(`[signup] resend api key missing; email not sent to ${to}`);
    return;
  }

  const recipient = getRecipient(to);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: `Your ${schoolName} workspace is ready`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 12px;">Welcome to School Clerk</h2>
          <p>Your school workspace for <strong>${schoolName}</strong> has been created successfully.</p>
          <p>
            <a href="${onboardingUrl}" style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:10px;">
              Continue onboarding
            </a>
          </p>
          <p>You can also access your workspace directly here:</p>
          <p><a href="${workspaceUrl}">${workspaceUrl}</a></p>
          <p>Your public school site is reserved here:</p>
          <p><a href="${siteUrl}">${siteUrl}</a></p>
          <p>If you were not expecting this message, you can safely ignore it.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send signup email: ${errorText}`);
  }
}

async function createEmailVerificationUrl({
  dashboardUrl,
  userId,
}: {
  dashboardUrl: string;
  userId: string;
}) {
  const token = crypto.randomUUID();

  await prisma.verification.deleteMany({
    where: {
      identifier: {
        startsWith: "email-verification:",
      },
      value: userId,
      deletedAt: null,
    },
  });

  await prisma.verification.create({
    data: {
      identifier: `email-verification:${token}`,
      value: userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  const verificationUrl = new URL("/verify-email", dashboardUrl);
  verificationUrl.searchParams.set("token", token);

  return verificationUrl.toString();
}

async function sendSignupVerificationEmail({
  to,
  schoolName,
  verificationUrl,
}: {
  to: string;
  schoolName: string;
  verificationUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ??
    "School Clerk <noreply@school-clerk.com>";

  if (!apiKey) {
    console.warn(
      `[signup] resend api key missing; verification email not sent to ${to}`,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [getRecipient(to)],
      subject: `Verify your ${schoolName} School Clerk account`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 12px;">Verify your email address</h2>
          <p>Your School Clerk workspace for <strong>${schoolName}</strong> is ready. Verify this email address to secure the owner account.</p>
          <p>
            <a href="${verificationUrl}" style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:10px;">
              Verify email
            </a>
          </p>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link expires in 24 hours.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send signup verification email: ${errorText}`);
  }
}

async function createSignupSuccessNotification(input: {
  schoolName: string;
  schoolProfileId: string;
  userId: string;
}) {
  const notification = createNotificationFromType("signup_success", {
    onboardingPath: "/onboarding/welcome",
    schoolName: input.schoolName,
    workspacePath: "/",
  });

  if (!notification.channels.includes("in_app")) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const recipientContact = await ensureNotificationContact(tx, {
      displayName: null,
      role: "user",
      schoolProfileId: input.schoolProfileId,
      userId: input.userId,
    });

    await tx.notification.create({
      data: {
        action: notification.action ?? undefined,
        body: notification.body,
        content: notification.body,
        headline: notification.title,
        link: notification.link,
        schoolProfileId: input.schoolProfileId,
        subject: notification.title,
        title: notification.title,
        type: notification.type,
        userId: input.userId,
        recipients: {
          create: {
            recipientContactId: recipientContact.id,
          },
        },
      },
    });
  });
}

export const createSaasProfileAction = actionClient
  .schema(signupSchema)
  .action(async ({ parsedInput: input }) => {
    const institutionType = getInstitutionType(input.institutionType);

    if (!institutionType) {
      throw new Error("Unknown institution type selected.");
    }

    if (!isInstitutionTypeEnabled(input.institutionType)) {
      throw new Error(
        `${institutionType.label} onboarding is not enabled yet. Please choose a released institution type.`,
      );
    }

    const email = normalizeEmail(input.email);
    const domainName = normalizeSubdomain(input.domainName);

    if (RESERVED_SUBDOMAINS.has(domainName)) {
      throw new Error("That subdomain is reserved. Please choose another one.");
    }

    const [domainTaken, emailTaken] = await Promise.all([
      prisma.tenantDomain.findFirst({
        where: {
          deletedAt: null,
          OR: [{ subdomain: domainName }, { customDomain: domainName }],
        },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: {
          deletedAt: null,
          email,
        },
        select: { id: true },
      }),
    ]);

    if (domainTaken) {
      throw new Error("That subdomain is already taken.");
    }

    if (emailTaken) {
      throw new Error("An account with that email already exists.");
    }

    const school = await prisma.$transaction(async (tx) => {
      const account = await tx.saasAccount.create({
        data: {
          email,
          name: input.adminName.trim(),
          phoneNo: input.phone?.trim() || null,
        },
      });

      const profile = await tx.schoolProfile.create({
        data: {
          name: input.institutionName.trim(),
          slug: slugify(input.institutionName),
          subDomain: domainName,
          institutionType: input.institutionType,
          studentCountEstimate: parseStudentCount(input.studentCount),
          country: input.country?.trim() || null,
          educationSystem: input.educationSystem?.trim() || null,
          curriculumType: input.curriculumType?.trim() || null,
          languageOfInstruction: input.languageOfInstruction?.trim() || null,
          accountId: account.id,
        },
      });

      await tx.tenantDomain.create({
        data: {
          subdomain: domainName,
          isPrimary: true,
          isVerified: true,
          schoolProfileId: profile.id,
          saasAccountId: account.id,
        },
      });

      return {
        accountId: account.id,
        schoolId: profile.id,
        schoolName: profile.name,
        subDomain: profile.subDomain,
      };
    });

    let createdUserId: string | null = null;

    try {
      const requestHeaders = new Headers(await headers());
      const signUpResponse = await auth.api.signUpEmail({
        body: {
          email,
          name: input.adminName.trim(),
          password: input.password,
          role: "ADMIN",
        },
        headers: requestHeaders,
      });

      createdUserId = signUpResponse?.user?.id ?? null;

      if (!createdUserId) {
        throw new Error("Could not create the admin account.");
      }

      await prisma.user.update({
        where: {
          id: createdUserId,
        },
        data: {
          saasAccountId: school.accountId,
          phoneNo: input.phone?.trim() || null,
        },
      });
    } catch (error) {
      await prisma.$transaction(async (tx) => {
        if (createdUserId) {
          await tx.account.deleteMany({
            where: {
              userId: createdUserId,
            },
          });
          await tx.user.deleteMany({
            where: {
              id: createdUserId,
            },
          });
        }

        await tx.tenantDomain.deleteMany({
          where: {
            saasAccountId: school.accountId,
          },
        });
        await tx.schoolProfile.deleteMany({
          where: {
            accountId: school.accountId,
          },
        });
        await tx.saasAccount.deleteMany({
          where: {
            id: school.accountId,
          },
        });
      });

      throw error;
    }

    if (!createdUserId) {
      throw new Error("Could not create the admin account.");
    }

    const dashboardUrl = buildDashboardTenantUrl(school.subDomain);
    const siteUrl = buildSchoolSiteUrl(school.subDomain);
    const onboardingPath = "/onboarding/welcome";
    const onboardingUrl = buildDashboardTenantUrl(
      school.subDomain,
      onboardingPath,
    );
    const loginUrl = buildDashboardTenantUrl(school.subDomain, "/login");
    const onboardingLoginUrl = new URL(loginUrl);
    onboardingLoginUrl.searchParams.set("email", email);
    onboardingLoginUrl.searchParams.set("return_to", onboardingPath);

    if (
      process.env.NODE_ENV === "production" &&
      !new URL(siteUrl).host.endsWith("vercel.app")
    ) {
      try {
        await provisionSchoolVercelDomains({
          dashboardDomain: new URL(dashboardUrl).host,
          siteDomain: new URL(siteUrl).host,
        });
      } catch (error) {
        console.error("[signup] Failed to provision Vercel domains", error);
      }
    }

    try {
      const verificationUrl = await createEmailVerificationUrl({
        dashboardUrl,
        userId: createdUserId,
      });
      await sendSignupVerificationEmail({
        to: email,
        schoolName: school.schoolName,
        verificationUrl,
      });
    } catch (error) {
      console.error("[signup] Failed to send signup verification email", error);
    }

    try {
      await sendSignupSuccessEmail({
        to: email,
        schoolName: school.schoolName,
        onboardingUrl,
        siteUrl,
        workspaceUrl: dashboardUrl,
      });
    } catch (error) {
      console.error("[signup] Failed to send signup success email", error);
    }

    try {
      await createSignupSuccessNotification({
        schoolName: school.schoolName,
        schoolProfileId: school.schoolId,
        userId: createdUserId,
      });
    } catch (error) {
      console.error("[signup] Failed to create signup notification", error);
    }

    return {
      email,
      institutionType: institutionType.label,
      loginUrl,
      onboardingUrl,
      onboardingLoginUrl: onboardingLoginUrl.toString(),
      schoolName: school.schoolName,
      subDomain: school.subDomain,
      siteUrl,
      workspaceUrl: dashboardUrl,
      devOnboardingUrl:
        process.env.NODE_ENV !== "production" ? onboardingUrl : null,
    };
  });
