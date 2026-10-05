import type { DatabaseTransaction } from "./prisma";
import type { Prisma } from "./generated/client";
import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import { getStudentAcademicReadContext } from "./student-academic-read";

export type StudentImportAuthority =
  | { kind: "session"; schoolId: string; userId: string; bearer: string }
  | { kind: "job"; jobId: string };
export class StudentImportAccessError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "CONFLICT" | "NOT_FOUND", message: string) {
    super(message);
    this.name = "StudentImportAccessError";
  }
}

export async function requireStudentImportAccess(db: DatabaseTransaction, authority: StudentImportAuthority) {
  let schoolId: string;
  let userId: string;
  let role: string | null | undefined;
  let configuration: unknown;
  let loginSessionId: string | null = null;
  let jobScope: { sessionId: string; termId: string } | null = null;
  if (authority.kind === "session") {
    const context = await getStudentAcademicReadContext(db, authority);
    if (!context) throw new StudentImportAccessError("FORBIDDEN", "Your import session is unavailable. Sign in again.");
    schoolId = context.school.id;
    userId = authority.userId;
    loginSessionId = context.loginSessionId;
    role = context.role;
    configuration = context.school.moduleConfiguration;
  } else {
    const job = await db.studentImportJob.findFirst({
      where: { id: authority.jobId, deletedAt: null, status: { in: ["PENDING", "RUNNING"] } },
      select: { schoolProfileId: true, createdByUserId: true, schoolSessionId: true, sessionTermId: true },
    });
    if (!job?.createdByUserId) throw new StudentImportAccessError("FORBIDDEN", "The import job is inactive or has no verified creator. Review it before resubmitting.");
    const user = await db.user.findFirst({
      where: { id: job.createdByUserId, deletedAt: null, tenant: { deletedAt: null, qaPurgeStartedAt: null } },
      select: { id: true, role: true, saasAccountId: true },
    });
    if (!user?.saasAccountId) throw new StudentImportAccessError("FORBIDDEN", "The import creator is no longer eligible.");
    const school = await db.schoolProfile.findFirst({
      where: { id: job.schoolProfileId, accountId: user.saasAccountId, deletedAt: null, account: { deletedAt: null, qaPurgeStartedAt: null } },
      select: { id: true, moduleConfiguration: { select: { version: true, revision: true, enabledModules: true, entitledModules: true } } },
    });
    if (!school) throw new StudentImportAccessError("FORBIDDEN", "The import school is unavailable to its creator.");
    schoolId = school.id;
    userId = user.id;
    role = user.role;
    configuration = school.moduleConfiguration;
    jobScope = { sessionId: job.schoolSessionId, termId: job.sessionTermId };
  }
  if (!["ADMIN", "REGISTRAR"].includes(role?.toUpperCase() ?? "") ||
    !canAccessModules(resolveModuleAccess(configuration), ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS", "BILLING_FINANCE"])) {
    throw new StudentImportAccessError("FORBIDDEN", "Import requires current student, academic and finance management access.");
  }
  return { schoolId, userId, loginSessionId, jobScope };
}

export async function requireStudentImportAcademicScope(db: DatabaseTransaction, scope: {
  schoolId: string; sessionId: string; termId: string;
}) {
  const term = await db.sessionTerm.findFirst({
    where: { id: scope.termId, schoolId: scope.schoolId, sessionId: scope.sessionId, deletedAt: null,
      session: { id: scope.sessionId, schoolId: scope.schoolId, deletedAt: null } },
    select: { lifecycleStatus: true },
  });
  if (!term) throw new StudentImportAccessError("NOT_FOUND", "The import session and term are unavailable in this school.");
  if (term.lifecycleStatus === "CLOSED") throw new StudentImportAccessError("CONFLICT", "This academic term is closed. Import cannot change its enrollments or fees.");
  const closed = await db.financeTermLedgerClose.findFirst({
    where: { schoolProfileId: scope.schoolId, sessionTermId: scope.termId, status: "CLOSED", deletedAt: null }, select: { id: true },
  });
  if (closed) throw new StudentImportAccessError("CONFLICT", "This term ledger is closed. Import cannot change its fees.");
}

export async function requireStudentImportTarget(db: DatabaseTransaction, scope: {
  schoolId: string; sessionId: string; termId: string;
}, classroomIds: string[]) {
  await requireStudentImportAcademicScope(db, scope);
  const ids = [...new Set(classroomIds)];
  if (!ids.length || ids.some((id) => !id)) throw new StudentImportAccessError("CONFLICT", "Select an available classroom for every import row.");
  const count = await db.classRoomDepartment.count({
    where: { id: { in: ids }, schoolProfileId: scope.schoolId, deletedAt: null,
      classRoom: { schoolProfileId: scope.schoolId, schoolSessionId: scope.sessionId, deletedAt: null } },
  });
  if (count !== ids.length) throw new StudentImportAccessError("NOT_FOUND", "An import classroom is unavailable in this school session.");
}
