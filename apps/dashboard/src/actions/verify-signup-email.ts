"use server";

import { completeSignupEmailVerification } from "@school-clerk/auth/signup-email-verification";
import { getTenantDomain } from "./cookies/auth-cookie";

export type SignupEmailVerificationState = { status: "ready" | "verified" | "unavailable" };

export async function verifySignupEmailAction(
  _previousState: SignupEmailVerificationState,
  formData: FormData,
): Promise<SignupEmailVerificationState> {
  try {
    const { domain } = await getTenantDomain();
    return await completeSignupEmailVerification({ token: formData.get("token"), tenantSlug: domain });
  } catch {
    return { status: "unavailable" };
  }
}
