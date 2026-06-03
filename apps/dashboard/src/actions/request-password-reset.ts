"use server";

import { auth } from "@/auth/server";
import { headers } from "next/headers";

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

  return auth.api.requestPasswordReset({
    body: {
      email,
      redirectTo: redirectTo.toString(),
    },
    headers: requestHeaders,
  });
}
