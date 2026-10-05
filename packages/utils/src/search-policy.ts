import { canAccessModules, type ResolvedModuleAccess } from "./module-config";

export function getSearchPolicy(access: ResolvedModuleAccess, role: string | null) {
  const normalizedRole = role?.trim().toUpperCase() ?? "";
  const students = ["ADMIN", "REGISTRAR"].includes(normalizedRole) && canAccessModules(access, ["STUDENT_MANAGEMENT"]);
  const classrooms = normalizedRole === "ADMIN" && canAccessModules(access, ["ACADEMIC_PROGRAMS"]);
  const staff = ["ADMIN", "TEACHER", "HR"].includes(normalizedRole) && canAccessModules(access, ["STAFF_MANAGEMENT"]);
  return { students, classrooms, staff, classroomStudents: classrooms && students };
}

export function getSearchAccessKey(access: ResolvedModuleAccess, role: string | null) {
  return JSON.stringify({ role: role?.trim().toUpperCase() ?? null, status: access.status,
    revision: access.config?.revision ?? null, modules: [...access.effectiveModules].sort(),
    policy: getSearchPolicy(access, role) });
}
