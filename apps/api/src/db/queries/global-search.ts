import type { TRPCContext } from "@api/trpc/init";
import { getSearchContext, searchGlobalRecords, type Prisma, type SearchIdentity } from "@school-clerk/db";
import { classroomDisplayName } from "@school-clerk/utils";
import { resolveModuleAccess } from "@school-clerk/utils/module-config";
import { getSearchAccessKey, getSearchPolicy } from "@school-clerk/utils/search-policy";
import { TRPCError } from "@trpc/server";

async function readSearchScope(ctx: TRPCContext, db: Prisma.TransactionClient, input: SearchIdentity) {
  if (!ctx.currentUser || !ctx.profile.authSessionId || input.userId !== ctx.currentUser.id ||
    input.schoolId !== ctx.profile.schoolId || input.sessionId !== (ctx.profile.sessionId || null)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Search workspace changed. Reload search." });
  }
  const context = await getSearchContext(db, { ...input, bearer: ctx.profile.authSessionId });
  if (!context) throw new TRPCError({ code: "FORBIDDEN", message: "Search is unavailable for this workspace." });
  const access = resolveModuleAccess(context.school.moduleConfiguration);
  return { schoolId: input.schoolId, userId: input.userId, loginSessionId: input.loginSessionId,
    sessionId: input.sessionId, role: context.user.role, effectiveModules: access.effectiveModules,
    accessKey: getSearchAccessKey(access, context.user.role), policy: getSearchPolicy(access, context.user.role) };
}

export function getGlobalSearchScope(ctx: TRPCContext, input: SearchIdentity) {
  return ctx.db.$transaction((tx) => readSearchScope(ctx, tx, input), { isolationLevel: "RepeatableRead" });
}

type GlobalSearchItem = {
  id: string; type: "student" | "staff" | "classroom"; group: "Students" | "Staff" | "Classrooms";
  title: string; subtitle: string | null; href: string; rank: number;
};

export function getGlobalSearchResults(ctx: TRPCContext, input: SearchIdentity & { accessKey: string; query: string; limit: number }) {
  return ctx.db.$transaction(async (tx) => {
    const scope = await readSearchScope(ctx, tx, input);
    if (input.accessKey !== scope.accessKey) throw new TRPCError({ code: "CONFLICT", message: "Search permissions changed. Refresh search." });
    const query = input.query.trim().toLowerCase().replace(/\s+/g, " ");
    if (query.length < 2) return [] as GlobalSearchItem[];
    const { students, staff, classrooms } = await searchGlobalRecords(tx, { ...input, query, policy: scope.policy });
    const results: GlobalSearchItem[] = [
      ...students.map((student) => ({ id: student.id, type: "student" as const, group: "Students" as const,
        title: student.full_name, subtitle: "Student record", href: `/students/${encodeURIComponent(student.id)}`, rank: Number(student.rank) || 0 })),
      ...classrooms.map((classroom) => {
        const title = classroomDisplayName({ className: classroom.class_name, departmentName: classroom.department_name });
        const count = scope.policy.classroomStudents && classroom.student_count !== null
          ? `${classroom.student_count} student${classroom.student_count === 1 ? "" : "s"}` : "Classroom";
        return { id: classroom.id, type: "classroom" as const, group: "Classrooms" as const, title: title || "Classroom",
          subtitle: `${classroom.session_title ? `${classroom.session_title} · ` : ""}${count}`,
          href: `/academic/classes?viewClassroomId=${encodeURIComponent(classroom.id)}${scope.policy.classroomStudents ? "&classroomTab=students" : ""}`,
          rank: Number(classroom.rank) || 0 };
      }),
      ...staff.map((member) => ({ id: member.id, type: "staff" as const, group: "Staff" as const,
        title: member.name, subtitle: member.email || "Staff record", href: `/staff/${encodeURIComponent(member.id)}`, rank: Number(member.rank) || 0 })),
    ];
    return results.sort((a, b) => b.rank - a.rank || a.title.localeCompare(b.title)).slice(0, input.limit);
  }, { isolationLevel: "RepeatableRead" });
}
