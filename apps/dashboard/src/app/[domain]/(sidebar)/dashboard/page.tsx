import { tenantRedirect } from "@/utils/tenant-redirect";

export default async function DashboardRedirectPage() {
  await tenantRedirect("/");
}
