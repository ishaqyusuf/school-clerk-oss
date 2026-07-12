"use server";

import { env } from "@/env";
import { Vercel } from "@vercel/sdk";

function requireVercelEnv(name: string, value?: string | null) {
  if (!value) {
    throw new Error(`${name} is required to provision Vercel domains.`);
  }

  return value;
}

function getVercelClient() {
  return new Vercel({
    bearerToken: requireVercelEnv(
      "VERCEL_BEARER_TOKEN",
      env.VERCEL_BEARER_TOKEN,
    ),
  });
}

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
  const vercel = getVercelClient();
  const result = await vercel.projects.addProjectDomain({
    idOrName: projectId,
    teamId: requireVercelEnv("VERCEL_TEAM_ID", env.VERCEL_TEAM_ID),
    slug: requireVercelEnv(
      "VERCEL_PROJECT_SLUG",
      projectSlug ?? env.VERCEL_PROJECT_SLUG,
    ),
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
      projectId: requireVercelEnv(
        "VERCEL_DASHBOARD_PROJECT_ID or VERCEL_PROJECT_ID",
        dashboardProjectId,
      ),
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
