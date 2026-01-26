import { ConfigureTermImport } from "@/components/configure-term-import";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Migration - Getting Started",
  description: "Configure data migration for the term",
};

export default async function Page({ params }) {
  const termId = (await params)?.id as string;
  return <ConfigureTermImport termId={termId} />;
}
