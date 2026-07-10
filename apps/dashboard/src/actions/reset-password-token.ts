"use server";

import { prisma } from "@school-clerk/db";

export async function getPasswordResetTokenStatus(token: string) {
  const normalizedToken = token.trim();

  if (!normalizedToken) {
    return {
      status: "missing" as const,
      expiresAt: null,
    };
  }

  const verification = await prisma.verification.findFirst({
    where: {
      identifier: `reset-password:${normalizedToken}`,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      expiresAt: true,
    },
  });

  if (!verification) {
    return {
      status: "invalid" as const,
      expiresAt: null,
    };
  }

  if (verification.expiresAt <= new Date()) {
    return {
      status: "expired" as const,
      expiresAt: verification.expiresAt.toISOString(),
    };
  }

  return {
    status: "valid" as const,
    expiresAt: verification.expiresAt.toISOString(),
  };
}
