import { ConfigureTerm } from "@/components/configure-term";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const termId = (await params).id;
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Term Setup</PageTitle>
      <ConfigureTerm termId={termId} />
    </div>
  );
}
