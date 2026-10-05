import { LegacyMigrationNotice } from "@/components/migration/legacy-migration-notice";
import { getLegacyMigrationStatus } from "@/lib/legacy-migration-access";

export default async function Migration() {
  await getLegacyMigrationStatus();
  return <LegacyMigrationNotice />;
}
