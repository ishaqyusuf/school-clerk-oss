"use server";

import { env } from "@/env";
import { Vercel } from "@vercel/sdk";

const vercel = new Vercel({
  bearerToken: env.VERCEL_BEARER_TOKEN,
});
export async function addDomainToVercel(domain: string) {
  const result = await vercel.projects.addProjectDomain({
    idOrName: env.VERCEL_PROJECT_ID,
    teamId: env.VERCEL_TEAM_ID,
    slug: env.VERCEL_PROJECT_SLUG,
    requestBody: {
      name: `${domain}.vercel.app`, // www.example.com
      gitBranch: null,
      //   redirect: "",
      //   redirectStatusCode: 307,
    },
  });
  return result;
}
