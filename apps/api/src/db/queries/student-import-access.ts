import type { TRPCContext } from "@api/trpc/init";
import { requireStudentImportAccess, requireStudentImportTarget, StudentImportAccessError,
  type Prisma, type StudentImportAuthority } from "@school-clerk/db";
import { TRPCError } from "@trpc/server";

export function studentImportSessionAuthority(ctx: TRPCContext): StudentImportAuthority {
  const schoolId = ctx.profile.schoolId;
  const userId = ctx.currentUser?.id;
  const bearer = ctx.profile.authSessionId;
  if (!schoolId || !userId || !bearer) throw new TRPCError({ code: "UNAUTHORIZED", message: "A live school session is required for import." });
  return { kind: "session", schoolId, userId, bearer };
}

export async function authorizeStudentImport(db: Prisma.TransactionClient, authority: StudentImportAuthority,
  target?: { schoolId: string; sessionId: string; termId: string; classroomIds: string[] }) {
  try {
    const access = await requireStudentImportAccess(db, authority);
    if (target) {
      if (target.schoolId !== access.schoolId || (access.jobScope &&
        (target.sessionId !== access.jobScope.sessionId || target.termId !== access.jobScope.termId))) {
        throw new StudentImportAccessError("FORBIDDEN", "Import workspace does not match its authorized source.");
      }
      await requireStudentImportTarget(db, target, target.classroomIds);
    }
    return access;
  } catch (error) {
    if (error instanceof StudentImportAccessError) throw new TRPCError({ code: error.code, message: error.message });
    throw error;
  }
}
