import { SetupFeesOnboardingClient } from "./setup-fees-client";

export default async function SetupFeesOnboardingPage({ params }) {
  const { domain } = await params;

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <SetupFeesOnboardingClient domain={domain} />
      </div>
    </div>
  );
}
