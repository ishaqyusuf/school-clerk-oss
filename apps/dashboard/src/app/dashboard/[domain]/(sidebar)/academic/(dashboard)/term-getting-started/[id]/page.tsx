import { ConfigureTerm } from "@/components/configure-term";

export default async function Page({ params }) {
  console.log(await params);
  const termId = (await params)?.id as string;
  return (
    <>
      <ConfigureTerm termId={termId} />
    </>
  );
}
