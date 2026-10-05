import "server-only";

import { loadSignupEmailVerificationDelivery } from "@school-clerk/auth/signup-email-verification";
import { SignupVerificationEmail, render } from "@school-clerk/email";
import { formatTenantEmailFrom, formatTenantEmailSubject, getEmailDeliveryRoutes } from "@school-clerk/utils";
import { getTenantDashboardEmailUrl } from "@/actions/tenant-email-url";

export async function sendSignupVerificationEmail(proof: { token: string; tenantSlug: string }) {
  const context = await loadSignupEmailVerificationDelivery(proof);
  if (!context) throw new Error("Verification email is unavailable.");
  const url = new URL(await getTenantDashboardEmailUrl({ path: "/verify-email", tenantSlug: context.tenantSlug }));
  url.searchParams.set("token", proof.token);
  const [route] = getEmailDeliveryRoutes(context.email);
  if (!route) throw new Error("Verification email is unavailable.");
  if (route.transport === "console") return { status: "console" as const };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Verification email delivery is not configured.");
  const html = await render(SignupVerificationEmail({ schoolName: context.schoolName, verificationUrl: url.toString() }));
  const current = await loadSignupEmailVerificationDelivery(proof);
  if (!current || current.email !== context.email || current.schoolName !== context.schoolName ||
    current.tenantSlug !== context.tenantSlug) throw new Error("Verification email is unavailable.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: formatTenantEmailFrom({ fallbackFrom: process.env.RESEND_FROM_EMAIL, schoolName: current.schoolName }),
      to: [route.recipient],
      subject: `${route.qaRouted ? `[QA: ${route.originalRecipient}] ` : ""}${formatTenantEmailSubject({
        message: "verify your account", schoolName: current.schoolName,
      })}`,
      headers: route.qaRouted ? { "X-QA-Original-Recipient": route.originalRecipient } : undefined,
      html,
    }),
  });
  if (!response.ok) throw new Error("Verification email could not be submitted.");
  return { status: "accepted" as const };
}
