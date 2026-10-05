import { getSession } from "@/auth/server";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { AcademicDataDirectionSettingsCard } from "@/components/academic-data-direction/settings-card";
import { SchoolInformationSettingsCard } from "@/components/settings/school-information-settings-card";
import { StudentNameFormatSettingsCard } from "@/components/student-name-format/settings-card";
import { InstitutionSettings } from "@/components/settings/institution-settings";
import { ModuleSettings } from "@/components/settings/module-settings";
import { InstitutionSettingsBoundary } from "@/components/settings/institution-settings-boundary";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "School Settings",
};

export default async function Page() {
  const [session, cookie] = await Promise.all([getSession(), getAuthCookie()]);
  if (cookie?.schoolId) {
    prefetch(trpc.schoolSettings.getModules.queryOptions({ schoolId: cookie.schoolId }));
  }
  prefetch(trpc.schoolSettings.getGeneral.queryOptions());
  prefetch(trpc.schoolSettings.getInstitution.queryOptions());
  prefetch(trpc.schoolSettings.getAcademicDataDirection.queryOptions());
  const role =
    (session?.user as { role?: string | null } | undefined)?.role ?? null;
  const canManage = role === "Admin" || role === "ADMIN";

  return (
    <HydrateClient>
      <div className="min-w-0 space-y-12 pb-12">
        <PageTitle>School Settings</PageTitle>
        <SchoolInformationSettingsCard />
        <InstitutionSettingsBoundary>
          <InstitutionSettings canManage={canManage} />
        </InstitutionSettingsBoundary>
        {cookie?.schoolId && (
          <InstitutionSettingsBoundary loadingLabel="Loading module settings">
            <ModuleSettings schoolId={cookie.schoolId} canManage={canManage} />
          </InstitutionSettingsBoundary>
        )}
        <StudentNameFormatSettingsCard canManage={canManage} />
        <AcademicDataDirectionSettingsCard canManage={canManage} />
      </div>
    </HydrateClient>
  );
}
