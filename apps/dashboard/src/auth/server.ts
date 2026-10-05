import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { initAuth } from "@school-clerk/auth";
import { resolveAuthConfiguration } from "@school-clerk/auth/configuration";

const configuration = resolveAuthConfiguration({
  nodeEnv: process.env.NODE_ENV,
  authUrl: process.env.BETTER_AUTH_URL,
  dashboardUrl: process.env.DASHBOARD_APP_URL,
  publicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
  appRootDomain: process.env.APP_ROOT_DOMAIN,
});
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret) throw new Error("BETTER_AUTH_SECRET is required for authentication.");

export const auth = initAuth({
  ...configuration,
  secret,
  //   discordClientId: env.AUTH_DISCORD_ID,
  //   discordClientSecret: env.AUTH_DISCORD_SECRET,
});
// “⌄” U+2304 Down Arrowhead Unicode Character
export type Session = typeof auth.$Infer.Session;
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
);
