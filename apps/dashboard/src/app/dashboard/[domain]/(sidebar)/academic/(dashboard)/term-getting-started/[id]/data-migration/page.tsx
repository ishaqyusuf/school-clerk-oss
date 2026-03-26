import { ConfigureTermImport } from "@/components/configure-term-import";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Migration - Getting Started",
  description: "Configure data migration for the term",
};

export default async function Page({ params }) {
  const termId = (await params)?.id as string;
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>Data Migration</PageTitle>
      <ConfigureTermImport termId={termId} />
    </div>
  );
}
