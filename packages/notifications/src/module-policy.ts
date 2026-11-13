import { ACTIVITY_NOTIFICATION_TYPE_PREFIX, activityNotificationType, isActivityType } from "@school-clerk/utils/activity";
import { canAccessModules, type ModuleId, type ResolvedModuleAccess } from "@school-clerk/utils/module-config";
import { ACTIVITY_REGISTRY, canReadActivityType, listNotifiableActivityTypes } from "./activities";
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

// `activity.<type>` notices (ADR-0093) follow the activity registry's read
// policy; only notifiable activity types can ever be delivered.
function canReadActivityNotification(type: string, access: ResolvedModuleAccess, role: string | null) {
  const activityType = type.slice(ACTIVITY_NOTIFICATION_TYPE_PREFIX.length);
  return isActivityType(activityType) && ACTIVITY_REGISTRY[activityType].notifiable &&
    canReadActivityType(activityType, access, role);
}

export function canReadSchoolNotification(type: string, access: ResolvedModuleAccess, role: string | null) {
  if (type.startsWith(ACTIVITY_NOTIFICATION_TYPE_PREFIX)) return canReadActivityNotification(type, access, role);
  if (!Object.hasOwn(notificationPolicies, type)) return false;
  const policy: NotificationPolicy = notificationPolicies[type as keyof typeof notificationPolicies];
  if (policy.roles && !policy.roles.includes((role ?? "").toLowerCase())) return false;
  // Workspace-created notices are recovery information, not domain access.
  return policy.modules.length === 0 || canAccessModules(access, policy.modules);
}

export function getReadableSchoolNotificationTypes(access: ResolvedModuleAccess, role: string | null) {
  return [
    ...Object.keys(notificationPolicies),
    ...listNotifiableActivityTypes().map((type) => activityNotificationType(type)),
  ].filter((type) => canReadSchoolNotification(type, access, role));
}

/**
 * Compact signature of the readable types, used as the feed `accessKey` cache
 * selector by the dashboard and re-derived by the API. The full JSON list
 * grew past URL-friendly size once activity types joined (ADR-0093). It is a
 * staleness check, not a credential.
 */
export function getSchoolNotificationAccessKey(access: ResolvedModuleAccess, role: string | null) {
  const types = getReadableSchoolNotificationTypes(access, role);
  const source = JSON.stringify(types);
  // FNV-1a 32-bit.
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `v2:${types.length}:${hash.toString(16).padStart(8, "0")}`;
}
