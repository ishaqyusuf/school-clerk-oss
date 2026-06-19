"use server";

import { env } from "@/env";
import { Vercel } from "@vercel/sdk";

const vercel = new Vercel({
  bearerToken: env.VERCEL_BEARER_TOKEN,
});

function isAlreadyRegisteredDomainError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return message.includes("already exists") || message.includes("already added");
}

export async function addDomainToVercelProject({
  domain,
  projectId,
  projectSlug,
}: {
  domain: string;
  projectId: string;
  projectSlug?: string | null;
}) {
  const result = await vercel.projects.addProjectDomain({
    idOrName: projectId,
    teamId: env.VERCEL_TEAM_ID,
    slug: projectSlug ?? env.VERCEL_PROJECT_SLUG,
    requestBody: {
      name: domain,
      gitBranch: null,
      //   redirect: "",
      //   redirectStatusCode: 307,
    },
  });
  return result;
}

export async function provisionSchoolVercelDomains({
  dashboardDomain,
  siteDomain,
}: {
  dashboardDomain: string;
  siteDomain: string;
}) {
  const siteProjectId = env.VERCEL_SITE_PROJECT_ID;
  const dashboardProjectId =
    env.VERCEL_DASHBOARD_PROJECT_ID ?? env.VERCEL_PROJECT_ID;

  if (!siteProjectId) {
    throw new Error(
      "VERCEL_SITE_PROJECT_ID is required to provision school site domains.",
    );
  }

  const domains = [
    {
      domain: siteDomain,
      projectId: siteProjectId,
      projectSlug: env.VERCEL_SITE_PROJECT_SLUG,
    },
    {
      domain: dashboardDomain,
      projectId: dashboardProjectId,
      projectSlug:
        env.VERCEL_DASHBOARD_PROJECT_SLUG ?? env.VERCEL_PROJECT_SLUG,
    },
  ];

  const results = [];

  for (const domain of domains) {
    try {
      results.push({
        domain: domain.domain,
        result: await addDomainToVercelProject(domain),
        status: "created" as const,
      });
    } catch (error) {
      if (isAlreadyRegisteredDomainError(error)) {
        results.push({
          domain: domain.domain,
          result: null,
          status: "already-exists" as const,
        });
        continue;
      }

      throw error;
    }
  }

  return results;
}
