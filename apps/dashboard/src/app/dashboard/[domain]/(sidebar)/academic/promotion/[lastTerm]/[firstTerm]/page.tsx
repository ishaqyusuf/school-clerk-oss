import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ lastTerm: string; firstTerm: string }>;
}

export default async function Page({ params }: PageProps) {
  const { lastTerm, firstTerm } = await params;

  redirect(`/academic/progression/${lastTerm}/${firstTerm}`);
}
