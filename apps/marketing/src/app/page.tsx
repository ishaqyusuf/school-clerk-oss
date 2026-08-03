import { resolveDashboardAppRootDomain } from "@school-clerk/utils";
import { DevTenantsFab } from "@/components/dev-tenants-fab";
import { MarketingLanding } from "@/components/landing/marketing-landing";

const isDev = process.env.NODE_ENV !== "production";
const configuredDashboardHost =
  process.env.NODE_ENV === "production"
    ? (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_ROOT_DOMAIN)
    : resolveDashboardAppRootDomain(process.env.APP_ROOT_DOMAIN);
const signUpHref = `${isDev ? "http" : "https"}://${configuredDashboardHost}/sign-up`;
const bookDemoHref =
  process.env.NEXT_PUBLIC_BOOK_DEMO_URL ??
  "mailto:hello@schoolclerk.com?subject=Book%20a%20SchoolClerk%20demo";

type TenantLink = {
  id: string;
  name: string;
  slug: string;
  studentCount: number;
};

async function getDevTenantLinks(): Promise<TenantLink[]> {
  if (!isDev) {
    return [];
  }

  const { listSchoolTenants } = await import("@school-clerk/db");

  return listSchoolTenants();
}

export default async function Home() {
  const schoolSiteRootDomain =
    process.env.SCHOOL_SITE_ROOT_DOMAIN ?? "school-clerk-site.localhost";
  const schoolSitePort = process.env.SCHOOL_SITE_PORT ?? 2400;
  const dashboardPort =
    process.env.SCHOOL_CLERK_DASHBOARD_APP_PORT ??
    process.env.DASHBOARD_PORT ??
    2200;
  const tenantLinks = await getDevTenantLinks();

  return (
    <>
      <MarketingLanding
        bookDemoHref={bookDemoHref}
        signUpHref={isDev ? signUpHref : undefined}
      />

      {isDev ? (
        <DevTenantsFab
          dashboardPort={dashboardPort}
          dashboardRootDomain={configuredDashboardHost}
          sitePort={schoolSitePort}
          siteRootDomain={schoolSiteRootDomain}
          tenants={tenantLinks}
        />
      ) : null}
    </>
  );
}
