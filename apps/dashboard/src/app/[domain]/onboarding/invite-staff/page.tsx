import { InviteStaffOnboardingClient } from "./invite-staff-client";

export default async function InviteStaffOnboardingPage({ params }) {
  const { domain } = await params;

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <InviteStaffOnboardingClient domain={domain} />
      </div>
    </div>
  );
}
