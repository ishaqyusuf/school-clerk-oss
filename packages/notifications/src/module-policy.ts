import { canAccessModules, type ModuleId, type ResolvedModuleAccess } from "@school-clerk/utils/module-config";
import type { schoolClerkNotificationTypes } from "./types/registry";

type NotificationPolicy = { modules: readonly ModuleId[]; roles?: readonly string[] };
const notificationPolicies = {
  signup_success: { modules: [] },
  staff_invitation: { modules: ["STAFF_MANAGEMENT"] },
  student_payment_received: { modules: ["STUDENT_MANAGEMENT", "BILLING_FINANCE"], roles: ["admin", "accountant"] },
  student_payment_cancelled: { modules: ["STUDENT_MANAGEMENT", "BILLING_FINANCE"], roles: ["admin", "accountant"] },
  service_payment_recorded: { modules: ["BILLING_FINANCE"], roles: ["admin", "accountant"] },
  service_payment_cancelled: { modules: ["BILLING_FINANCE"], roles: ["admin", "accountant"] },
  payroll_payment_recorded: { modules: ["STAFF_MANAGEMENT", "BILLING_FINANCE"], roles: ["admin", "accountant", "hr"] },
  payroll_payment_cancelled: { modules: ["STAFF_MANAGEMENT", "BILLING_FINANCE"], roles: ["admin", "accountant", "hr"] },
  assessment_public_link_requested: { modules: ["ASSESSMENT_AND_EXAMS"], roles: ["admin"] },
  assessment_public_link_approved: { modules: ["ASSESSMENT_AND_EXAMS"] },
  assessment_public_link_rejected: { modules: ["ASSESSMENT_AND_EXAMS"] },
} satisfies Record<keyof typeof schoolClerkNotificationTypes, NotificationPolicy>;

export function canReadSchoolNotification(type: string, access: ResolvedModuleAccess, role: string | null) {
  if (!Object.hasOwn(notificationPolicies, type)) return false;
  const policy: NotificationPolicy = notificationPolicies[type as keyof typeof notificationPolicies];
  if (policy.roles && !policy.roles.includes((role ?? "").toLowerCase())) return false;
  // Workspace-created notices are recovery information, not domain access.
  return policy.modules.length === 0 || canAccessModules(access, policy.modules);
}

export function getReadableSchoolNotificationTypes(access: ResolvedModuleAccess, role: string | null) {
  return Object.keys(notificationPolicies).filter((type) => canReadSchoolNotification(type, access, role));
}
