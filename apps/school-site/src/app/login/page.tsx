import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { resolveDashboardAppRootDomain } from "@school-clerk/utils";
import { resolvePublicTenant } from "@/lib/tenant/resolve-public-tenant";
import { resolveHost } from "@/lib/tenant/resolve-host";

function getDashboardLoginUrl(subdomain: string) {
  const appRoot = resolveDashboardAppRootDomain(process.env.APP_ROOT_DOMAIN);
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  if (process.env.NODE_ENV === "production") {
    const rootDomain = appRoot.startsWith("dashboard.")
      ? appRoot.slice("dashboard.".length)
      : appRoot;

    return `${protocol}://dashboard.${subdomain}.${rootDomain}/login`;
  }

  return `${protocol}://${subdomain}.${appRoot}/login`;
}

export default async function GlobalSchoolSiteLoginRedirect() {
  const headerStore = await headers();
  const host = resolveHost(headerStore.get("host"));
  const publicTenant = await resolvePublicTenant(host);

  if (!publicTenant) notFound();

  const { tenant } = publicTenant;
  const subdomain = tenant.subdomain || "school";

  redirect(getDashboardLoginUrl(subdomain));
}
