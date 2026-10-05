import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@school-clerk/ui/card";
import { ParentSetupConfirmationForm } from "../parent-setup-form";

export const metadata: Metadata = { title: "Verify parent login", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function ParentSetupPage({ params, searchParams }: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ application?: string; token?: string }>;
}) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const valid = typeof query.application === "string" && Boolean(query.application) &&
    typeof query.token === "string" && /^[a-f0-9]{64}$/.test(query.token);
  const returnUrl = `/enroll/${encodeURIComponent(code)}${query.application ? `?submitted=${encodeURIComponent(query.application)}` : ""}`;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
      <Card className="mx-auto w-full min-w-0 max-w-xl break-words bg-white">
        <CardHeader><CardTitle>Verify parent login</CardTitle><CardDescription>Complete setup using the private link delivered to your email.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          {valid ? <ParentSetupConfirmationForm code={code} applicationId={query.application!} token={query.token!} /> : <p role="alert">This setup link is incomplete. Return to your application and request another email.</p>}
          <Link className="inline-flex min-h-11 items-center text-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2" href={returnUrl}>Return to your application</Link>
        </CardContent>
      </Card>
    </main>
  );
}
