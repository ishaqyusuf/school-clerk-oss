import type { Auth } from "@school-clerk/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authPath = "/api/auth";

function getOriginFromHost(host: string, protocol: "http" | "https") {
  const trimmedHost = host.trim().replace(/\/+$/, "");

  if (!trimmedHost) return null;

  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmedHost)
        ? trimmedHost
        : `${protocol}://${trimmedHost}`,
    );

    return url.origin;
  } catch {
    return null;
  }
}

function getAuthBaseUrl() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${authPath}`;
  }

  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const host =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL ||
    "school-clerk-dashboard.localhost:1355";
  const origin = getOriginFromHost(host, protocol);

  return `${origin ?? `http://school-clerk-dashboard.localhost:1355`}${authPath}`;
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  $InferAuth: {} as Auth["options"],
  plugins: [inferAdditionalFields<Auth>()],
});
