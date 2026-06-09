"use server";

import { auth } from "@/auth/server";
import { headers } from "next/headers";
import { prisma } from "@school-clerk/db";
import { ensureCredentialAccount } from "./ensure-credential-account";

async function getCurrentOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}

export async function requestPasswordReset(email: string) {
  const currentOrigin = await getCurrentOrigin();
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("origin", currentOrigin);

  const redirectTo = new URL(`${currentOrigin}/reset-password`);
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      email: email.trim().toLowerCase(),
    },
    select: {
      id: true,
    },
  });

  await Promise.all(
    users.map((user) => ensureCredentialAccount(prisma, user.id)),
  );

  return auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: redirectTo.toString(),
    },
    headers: requestHeaders,
  });
}
