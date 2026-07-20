import { getSession } from "@/auth/server";
import { AcademicDataDirectionSettingsCard } from "@/components/academic-data-direction/settings-card";
import { SchoolInformationSettingsCard } from "@/components/settings/school-information-settings-card";
import { StudentNameFormatSettingsCard } from "@/components/student-name-format/settings-card";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "School Settings",
};

export default async function Page() {
  const session = await getSession();
  prefetch(trpc.schoolSettings.getGeneral.queryOptions());
  prefetch(trpc.schoolSettings.getAcademicDataDirection.queryOptions());
  const role =
    (session?.user as { role?: string | null } | undefined)?.role ?? null;
  const canManage = role === "Admin" || role === "ADMIN";

  return (
    <HydrateClient>
      <div className="space-y-12 pb-12">
        <SchoolInformationSettingsCard />
        <StudentNameFormatSettingsCard canManage={canManage} />
        <AcademicDataDirectionSettingsCard canManage={canManage} />
      </div>
    </HydrateClient>
  );
}
