import type { Metadata } from "next";
import { SignupEmailVerificationForm } from "@/components/forms/signup-email-verification-form";

export const metadata: Metadata = {
  title: "Confirm email",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function VerifyEmailPage({ searchParams }: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  const validToken = typeof token === "string" && /^[a-f0-9]{64}$/.test(token) ? token : null;
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <SignupEmailVerificationForm key={validToken ?? "missing"} token={validToken} />
    </main>
  );
}
