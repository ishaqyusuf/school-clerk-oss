import { SetupClassroomsOnboardingClient } from "./setup-classrooms-client";

export default async function SetupClassroomsOnboardingPage({ params }) {
  const { domain } = await params;

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <SetupClassroomsOnboardingClient domain={domain} />
      </div>
    </div>
  );
}
