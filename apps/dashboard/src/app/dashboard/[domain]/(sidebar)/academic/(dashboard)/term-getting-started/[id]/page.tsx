import { ConfigureTerm } from "@/components/configure-term";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default async function Page({ params }) {
  console.log(await params);
  const termId = (await params)?.id as string;
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Term Setup</PageTitle>
      <ConfigureTerm termId={termId} />
    </div>
  );
}
