import type { Auth } from "@school-clerk/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const authPath = "/api/auth";

function getAuthBaseUrl() {
  // Browser calls stay on the actual tenant origin. Server reads use auth/server;
  // this client does not invent a localhost, preview or demo origin during SSR.
  return typeof window === "undefined"
    ? undefined
    : new URL(authPath, window.location.origin).toString();
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  sessionOptions: { refetchInterval: 300, refetchOnWindowFocus: true },
  $InferAuth: {} as Auth["options"],
  plugins: [inferAdditionalFields<Auth>()],
});
