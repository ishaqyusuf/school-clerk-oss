import "server-only";

import { createSignupCompletionNotification, getSignupCompletionContext, prisma, type SignupCompletionScope } from "@school-clerk/db";
import { WorkspaceReadyEmail, render } from "@school-clerk/email";
import { createNotificationFromType } from "@school-clerk/notifications";
import { formatTenantEmailFrom, formatTenantEmailSubject, getEmailDeliveryRoutes } from "@school-clerk/utils";
import { buildDashboardTenantUrl, buildSchoolSiteUrl } from "./tenant-urls";

export async function sendSignupWorkspaceEmail(scope: SignupCompletionScope) {
  const context = await getSignupCompletionContext(prisma, scope);
  if (!context || context.preference?.email === false) return "skipped" as const;
  const notice = createNotificationFromType("signup_success", { schoolName: context.school.name,
    onboardingPath: "/onboarding/welcome", workspacePath: "/" });
  if (!notice.channels.includes("email")) return "skipped" as const;
  const [route] = getEmailDeliveryRoutes(context.owner.email);
  if (!route) throw new Error("Signup email delivery is unavailable.");
  if (route.transport === "console") return "console" as const;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Signup email delivery is not configured.");
  const html = await render(WorkspaceReadyEmail({ schoolName: context.school.name,
    onboardingUrl: buildDashboardTenantUrl(context.school.subDomain, "/onboarding/welcome"),
    workspaceUrl: buildDashboardTenantUrl(context.school.subDomain), siteUrl: buildSchoolSiteUrl(context.school.subDomain) }));
  const current = await getSignupCompletionContext(prisma, scope);
  if (!current || current.preference?.email === false || current.owner.email !== context.owner.email ||
    current.school.name !== context.school.name || current.school.subDomain !== context.school.subDomain) return "skipped" as const;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: formatTenantEmailFrom({ schoolName: current.school.name, fallbackFrom: process.env.RESEND_FROM_EMAIL }),
      to: [route.recipient], html,
      subject: `${route.qaRouted ? `[QA: ${route.originalRecipient}] ` : ""}${formatTenantEmailSubject({ schoolName: current.school.name, message: "workspace is ready" })}`,
      headers: route.qaRouted ? { "X-QA-Original-Recipient": route.originalRecipient } : undefined,
    }),
  });
  if (!response.ok) throw new Error("Signup email could not be submitted.");
  return "accepted" as const;
}

export async function notifySignupCompletion(scope: SignupCompletionScope) {
  return prisma.$transaction(async (tx) => {
    const context = await getSignupCompletionContext(tx, scope);
    if (!context) return "skipped" as const;
    const notice = createNotificationFromType("signup_success", { schoolName: context.school.name,
      onboardingPath: "/onboarding/welcome", workspacePath: "/" });
    if (!notice.channels.includes("in_app")) return "skipped" as const;
    const created = await createSignupCompletionNotification(tx, scope, { ...notice, schoolName: context.school.name });
    return created ? "created" as const : "skipped" as const;
  }, { isolationLevel: "Serializable" });
}
