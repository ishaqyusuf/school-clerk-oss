import { redirect } from "next/navigation";

export default async function Page({ params }) {
  const { domain } = await params;
  redirect(`/dashboard/${domain}/dashboard`);
}
