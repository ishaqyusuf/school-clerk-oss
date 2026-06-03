import { tenantRedirect } from "@/utils/tenant-redirect";

export default async function LegacyCreateSchoolPage() {
  await tenantRedirect("/onboarding/welcome");
}
