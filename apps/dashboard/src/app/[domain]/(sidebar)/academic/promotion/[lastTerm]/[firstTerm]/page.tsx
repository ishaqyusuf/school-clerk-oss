import { tenantRedirect } from "@/utils/tenant-redirect";

interface PageProps {
  params: Promise<{ lastTerm: string; firstTerm: string }>;
}

export default async function Page({ params }: PageProps) {
  const { lastTerm, firstTerm } = await params;

  await tenantRedirect(`/academic/progression/${lastTerm}/${firstTerm}`);
}
