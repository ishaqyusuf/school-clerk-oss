"use server";

import { headers } from "next/headers";
import { reissueSignupEmailVerification } from "@school-clerk/auth/signup-email-verification";
import { auth } from "@/auth/server";
import { sendSignupVerificationEmail } from "@/features/signup/verification-email";
import { getTenantDomain } from "./cookies/auth-cookie";

export type ResendSignupVerificationState = {
  status: "ready" | "sign_in" | "unavailable" | "verified" | "cooldown" | "accepted" | "console";
};

export async function resendSignupVerificationAction(
  _previousState: ResendSignupVerificationState,
  _formData: FormData,
): Promise<ResendSignupVerificationState> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.session.token || !session.user.id) return { status: "sign_in" };
    const { domain } = await getTenantDomain();
    const issued = await reissueSignupEmailVerification({
      userId: session.user.id, sessionToken: session.session.token, tenantSlug: domain,
    });
    if (issued.status !== "issued") return { status: issued.status };
    return await sendSignupVerificationEmail(issued);
  } catch {
    return { status: "unavailable" };
  }
}
