import { redirect } from "next/navigation";
import { getSession } from "@/auth/server";
import { getFirstPermittedHref } from "@/sidebar/utils";

export default async function Page({ params }) {
  const { domain } = await params;
  const session = await getSession();
  const href = getFirstPermittedHref({
    role: session?.user?.role,
  });
  return <>abc</>;
  // redirect(`/dashboard/${domain}${href}`);
}
