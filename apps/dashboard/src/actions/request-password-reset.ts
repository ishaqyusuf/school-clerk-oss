"use server";

import { auth } from "@/auth/server";
import { getPasswordRecoveryIdentity, prisma } from "@school-clerk/db";
import { getTenantUrlHeaderNames } from "@school-clerk/tenant-url";
import { getDashboardTenantUrlConfig } from "@/utils/tenant-url-config";
import { headers } from "next/headers";
import { z } from "zod";

const recoveryEmailSchema = z.string().trim().toLowerCase().email().max(320);

// Request acknowledgement is deliberately identical for unavailable identities.
// Password setup for new staff stays on the bound invitation flow.
export async function requestPasswordReset(email: string) {
  const parsed = recoveryEmailSchema.safeParse(email);
  if (!parsed.success) throw new Error("Enter a valid email address.");
  const identity = await getPasswordRecoveryIdentity(prisma, parsed.data);
  if (!identity) return { redirectTo: null };

  const requestHeaders = new Headers(await headers());
  const tenantHeaderNames = getTenantUrlHeaderNames(getDashboardTenantUrlConfig());
  const tenantSlug = requestHeaders.get(tenantHeaderNames.domain)?.trim().toLowerCase();
  if (tenantSlug && !identity.user.tenant?.schools.some((school) =>
    school.subDomain === tenantSlug || school.domains.some((domain) =>
      domain.subdomain === tenantSlug || domain.customDomain?.toLowerCase() === tenantSlug))) {
    return { redirectTo: null };
  }

  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data },
      headers: requestHeaders,
    });
  } catch {
    // Do not disclose account eligibility or provider payloads to this public form.
    console.error("[auth] Password recovery request could not be completed");
  }
  return { redirectTo: null };
}
