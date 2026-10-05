import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { getLocalLoginSchool, listLocalLoginUsers, prisma } from "@school-clerk/db";
import { isDevelopmentQuickLoginEnabled, isLocalDevelopmentDatabase, isLoopbackRequestHost } from "@school-clerk/auth/development";
import { headers } from "next/headers";
import { buildDashboardSignupUrl } from "@/features/signup/tenant-urls";
import { Client } from "./client";

export async function generateMetadata({ params }) {
  const { domain } = await params;
  return buildTenantPageMetadata({
    domain,
    pathname: "/login",
    noIndex: true,
  });
}
export default async function Page({ params, searchParams }) {
  const [{ domain }, query] = await Promise.all([params, searchParams]);
  const requestHeaders = await headers();
  const signupHref = buildDashboardSignupUrl({
    currentHost: requestHeaders.get("host"),
    currentProtocol: requestHeaders.get("x-forwarded-proto"),
  });
  const tenant = await prisma.schoolProfile.findFirst({
    where: {
      deletedAt: null,
      subDomain: domain,
    },
    select: {
      name: true,
    },
  });

  const isLocalHost = isLoopbackRequestHost(requestHeaders.get("host"));
  const localLoginSchool = isLocalDevelopmentDatabase() && isLocalHost
    ? await getLocalLoginSchool(prisma, domain) : null;
  const localLoginUsers = localLoginSchool
    ? await listLocalLoginUsers(prisma, localLoginSchool.id) : [];
  const quickLoginUsers = isDevelopmentQuickLoginEnabled() && isLocalHost
    ? localLoginUsers : [];

  return (
    <Client
      initialEmail={typeof query?.email === "string" ? query.email : ""}
      initialError={typeof query?.error === "string" ? query.error : ""}
      initialRememberMe={query?.rememberMe !== "0"}
      schoolName={tenant?.name ?? domain}
      signupHref={signupHref}
      quickLoginUsers={quickLoginUsers}
      localLoginUsers={localLoginUsers}
    />
  );
}
