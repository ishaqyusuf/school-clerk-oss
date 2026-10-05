import "server-only";

import { requireDashboardModules } from "./module-access";

const ownershipMessage = "Legacy migration is unavailable until its dataset owner is confirmed and a school-scoped migration is approved. Use the student directory for current registrations and imports.";

export async function getLegacyMigrationStatus() {
  await requireDashboardModules(
    ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS", "BILLING_FINANCE"],
    ["Admin"],
  );
  // These global Posts datasets have no school/account binding. Neither the
  // current workspace nor a module grant is evidence of dataset ownership.
  return { status: "ownership-required" as const, message: ownershipMessage };
}

export async function requireLegacyMigrationAccess(): Promise<never> {
  const status = await getLegacyMigrationStatus();
  // Do not replace this with an environment toggle. Resuming needs an approved
  // owner mapping and scoped data/cache/write implementation first.
  throw new Error(status.message);
}
