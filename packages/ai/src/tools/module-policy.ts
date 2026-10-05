import { canAccessModules, type ModuleId, type ResolvedModuleAccess } from "@school-clerk/utils/module-config";
import type { AiCapabilityKey } from "../capabilities";

type ToolPolicy = { capability: AiCapabilityKey; modules: readonly ModuleId[] };

// Requirements follow the data each tool actually reads/writes, not the broad
// capability label. These are not universal module dependencies or grants.
const toolPolicies = {
  searchStudents: { capability: "students.read", modules: ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"] },
  listClassrooms: { capability: "students.enrollment", modules: ["ACADEMIC_PROGRAMS"] },
  enrollStudent: { capability: "students.enrollment", modules: ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"] },
  getStudentPaymentData: { capability: "finance.read", modules: ["STUDENT_MANAGEMENT", "BILLING_FINANCE"] },
  receiveStudentPayment: { capability: "finance.write", modules: ["STUDENT_MANAGEMENT", "BILLING_FINANCE"] },
  searchInventoryItems: { capability: "inventory.read", modules: ["INVENTORY_ASSETS"] },
  createInventoryItem: { capability: "inventory.write", modules: ["INVENTORY_ASSETS"] },
  recordInventoryIssuance: { capability: "inventory.write", modules: ["INVENTORY_ASSETS"] },
  searchStaffMembers: { capability: "staff.read", modules: ["STAFF_MANAGEMENT", "ACADEMIC_PROGRAMS", "ATTENDANCE"] },
  getTeacherWorkspaceSummary: { capability: "staff.read", modules: ["STAFF_MANAGEMENT", "ASSESSMENT_AND_EXAMS", "ATTENDANCE"] },
  getStudentAttendanceHistory: { capability: "attendance.read", modules: ["ATTENDANCE"] },
  recordAssessmentScores: { capability: "assessments.write", modules: ["ASSESSMENT_AND_EXAMS"] },
  searchGuardians: { capability: "parents.read", modules: ["PARENT_PORTAL"] },
} satisfies Record<string, ToolPolicy>;

export function getSchoolAiToolPolicy(toolName: string): ToolPolicy | null {
  if (!Object.hasOwn(toolPolicies, toolName)) return null;
  return toolPolicies[toolName as keyof typeof toolPolicies];
}

export function canUseSchoolAiTool(
  toolName: string,
  access: ResolvedModuleAccess,
  capabilities: readonly AiCapabilityKey[],
) {
  const policy = getSchoolAiToolPolicy(toolName);
  return Boolean(policy && capabilities.includes(policy.capability) &&
    canAccessModules(access, ["AI_ASSISTANT", ...policy.modules]));
}

export function hasSchoolAiCapabilityModules(capability: AiCapabilityKey, access: ResolvedModuleAccess) {
  return Object.entries(toolPolicies).some(([name, policy]) =>
    policy.capability === capability && canUseSchoolAiTool(name, access, [capability]));
}

export function getSchoolAiAvailableToolNames(access: ResolvedModuleAccess, capabilities: readonly AiCapabilityKey[]) {
  return Object.keys(toolPolicies).filter((name) => canUseSchoolAiTool(name, access, capabilities));
}

export class SchoolAiToolAccessError extends Error {
  constructor(message = "This tool is no longer available in the current workspace.") {
    super(message);
    this.name = "SchoolAiToolAccessError";
  }
}
