"use server";

import { getPasswordRecoveryToken, prisma } from "@school-clerk/db";

export async function getPasswordResetTokenStatus(token: string) {
  if (typeof token !== "string" || !token.trim()) {
    return { status: "missing" as const, expiresAt: null };
  }
  const context = await getPasswordRecoveryToken(prisma, token);
  if (!context) return { status: "invalid" as const, expiresAt: null };
  return { status: "valid" as const, expiresAt: context.verification.expiresAt.toISOString() };
}
