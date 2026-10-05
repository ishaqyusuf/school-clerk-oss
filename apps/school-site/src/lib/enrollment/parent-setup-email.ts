import "server-only";

import { PasswordResetEmail, render } from "@school-clerk/email";
import { formatTenantEmailFrom, formatTenantEmailSubject, getEmailDeliveryRoutes } from "@school-clerk/utils";
import { createElement } from "react";

export async function sendEnrollmentParentSetupEmail(input: {
  token: string; email: string; name: string; schoolName: string;
  subDomain: string; code: string; applicationId: string;
}) {
  const [route] = getEmailDeliveryRoutes(input.email);
  // A captured email is not delivery of an identity proof. Never expose the
  // capability in logs or return it through a development-only shortcut.
  if (!route || route.transport === "console" || !process.env.RESEND_API_KEY) {
    throw new Error("Email delivery is unavailable.");
  }
  const configuredRoot = process.env.SCHOOL_SITE_ROOT_DOMAIN ?? process.env.APP_ROOT_DOMAIN;
  if (!configuredRoot) throw new Error("School-site origin is not configured.");
  const root = new URL(configuredRoot.includes("://") ? configuredRoot : `https://${configuredRoot}`);
  if (root.username || root.password || root.pathname !== "/" || root.search || root.hash ||
    !/^[a-z0-9-]+$/i.test(input.subDomain)) {
    throw new Error("School-site origin is invalid.");
  }
  const hostname = root.hostname.replace(/^dashboard\./, "");
  root.hostname = `${input.subDomain}.${hostname === "school-clerk.localhost" ? "school-clerk-site.localhost" : hostname}`;
  root.protocol = "https:";
  root.pathname = `/enroll/${encodeURIComponent(input.code)}/parent-setup`;
  root.searchParams.set("application", input.applicationId);
  root.searchParams.set("token", input.token);
  const html = await render(createElement(PasswordResetEmail, {
    name: input.name, schoolName: input.schoolName, staffRole: "Parent", url: root.toString(),
  }));
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: formatTenantEmailFrom({ fallbackFrom: process.env.RESEND_FROM_EMAIL, schoolName: input.schoolName }),
      to: [route.recipient],
      subject: `${route.qaRouted ? `[QA: ${route.originalRecipient}] ` : ""}${formatTenantEmailSubject({ message: "verify your parent login", schoolName: input.schoolName })}`,
      html,
      headers: route.qaRouted ? { "X-QA-Original-Recipient": route.originalRecipient } : undefined,
    }),
  });
  if (!response.ok) throw new Error("Setup email delivery failed.");
}
