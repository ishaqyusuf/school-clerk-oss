"use server";

import { completeEnrollmentParentSetup, requestEnrollmentParentSetup } from "@school-clerk/auth/enrollment-parent";
import { sendEnrollmentParentSetupEmail } from "./parent-setup-email";

export type ParentSetupState = { status: "idle" | "success" | "error"; message: string };

export async function requestParentSetupEmail(
  code: string, applicationId: string, _previous: ParentSetupState, _form: FormData,
): Promise<ParentSetupState> {
  try {
    await requestEnrollmentParentSetup({ code, applicationId }, (message) =>
      sendEnrollmentParentSetupEmail({ ...message, code, applicationId }));
    return { status: "success", message: "Check the primary parent's email for a private setup link. It expires in 30 minutes. Only the newest link works." };
  } catch {
    return { status: "error", message: "We could not send a setup link. Wait one minute before retrying, or contact the school if the application details or email delivery need attention." };
  }
}

export async function confirmParentSetup(
  code: string, applicationId: string, token: string, _previous: ParentSetupState, form: FormData,
): Promise<ParentSetupState> {
  const password = form.get("password");
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return { status: "error", message: "Use a password between 8 and 128 characters." };
  }
  try {
    const result = await completeEnrollmentParentSetup({ code, applicationId, token, password });
    return { status: "success", message: result.hadPassword
      ? "Your email is verified and your application is linked. Your existing password is unchanged. Sign in on the school's dashboard, or use its password recovery page."
      : "Your parent login is ready. Sign in on the school's dashboard with your email and the password you just chose. Ward access follows admission approval." };
  } catch {
    return { status: "error", message: "Setup could not be completed. The link may have expired, been replaced or used, or the application/account may need school review. Request a new link from your application page or contact the school." };
  }
}
