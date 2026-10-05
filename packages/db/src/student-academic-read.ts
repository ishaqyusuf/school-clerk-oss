import type { Prisma } from "./generated/client";

export async function getStudentAcademicReadContext(db: Prisma.TransactionClient, input: {
  schoolId: string; userId: string; bearer: string;
}) {
  const session = await db.session.findFirst({
    where: {
      userId: input.userId, deletedAt: null, expiresAt: { gt: new Date() },
      OR: [{ token: input.bearer }, { id: input.bearer }],
      user: { deletedAt: null, tenant: { deletedAt: null, qaPurgeStartedAt: null } },
    },
    select: { id: true, user: { select: { saasAccountId: true, role: true } } },
  });
  if (!session?.user.saasAccountId) return null;
  const school = await db.schoolProfile.findFirst({
    where: {
      id: input.schoolId, accountId: session.user.saasAccountId, deletedAt: null,
      account: { deletedAt: null, qaPurgeStartedAt: null },
    },
    select: { id: true, studentNameFormat: true, moduleConfiguration: { select: {
      version: true, revision: true, enabledModules: true, entitledModules: true,
    } } },
  });
  return school ? { school, role: session.user.role, loginSessionId: session.id } : null;
}

export async function getStudentAcademicRecords(db: Prisma.TransactionClient, input: {
  schoolId: string; studentId: string;
}) {
  const { schoolId, studentId } = input;
  const student = await db.students.findFirst({
    where: { id: studentId, schoolProfileId: schoolId, deletedAt: null },
    select: {
      id: true, name: true, surname: true, otherName: true, dob: true, gender: true, createdAt: true,
      guardians: {
        where: { deletedAt: null, guardian: { schoolProfileId: schoolId, deletedAt: null } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 1,
        select: { guardian: { select: { id: true, name: true, phone: true, phone2: true } } },
      },
    },
  });
  if (!student) return null;
  const terms = await db.sessionTerm.findMany({
    where: { schoolId, deletedAt: null, session: { schoolId, deletedAt: null } },
    orderBy: [{ endDate: "desc" }, { id: "asc" }],
    select: { id: true, title: true, sessionId: true, session: { select: { id: true, title: true } } },
  });
  // Read only references attached to this already-owned canonical student.
  // These never select a tenant or expose foreign record contents.
  const references = await db.studentTermForm.findMany({
    where: { studentId, deletedAt: null },
    select: { schoolProfileId: true, sessionTermId: true },
  });
  const forms = await db.studentTermForm.findMany({
    where: {
      studentId, schoolProfileId: schoolId, deletedAt: null,
      sessionTermId: { in: terms.map((term) => term.id) },
      schoolSession: { schoolId, deletedAt: null },
      sessionForm: { studentId, schoolProfileId: schoolId, deletedAt: null,
        schoolSession: { schoolId, deletedAt: null } },
      classroomDepartment: { schoolProfileId: schoolId, deletedAt: null,
        classRoom: { schoolProfileId: schoolId, deletedAt: null, session: { schoolId, deletedAt: null } } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true, sessionTermId: true, schoolSessionId: true, admissionType: true,
      sessionForm: { select: { id: true, schoolSessionId: true } },
      classroomDepartment: { select: { id: true, departmentName: true, classRoomsId: true,
        classRoom: { select: { id: true, name: true, schoolSessionId: true } } } },
    },
  });
  const sessionsByTerm = new Map(terms.map((term) => [term.id, term.sessionId]));
  const validForms = forms.filter((form) => {
    const sessionId = form.sessionTermId ? sessionsByTerm.get(form.sessionTermId) : null;
    return !!sessionId && form.schoolSessionId === sessionId &&
      form.sessionForm.schoolSessionId === sessionId &&
      form.classroomDepartment?.classRoom?.schoolSessionId === sessionId;
  });
  const termIds = new Set(terms.map((term) => term.id));
  const hasUnmappedHistory = references.some((reference) => reference.schoolProfileId !== schoolId ||
    !reference.sessionTermId || !termIds.has(reference.sessionTermId));
  const referenceCounts = new Map<string, number>();
  for (const reference of references) {
    if (reference.sessionTermId && termIds.has(reference.sessionTermId)) {
      referenceCounts.set(reference.sessionTermId, (referenceCounts.get(reference.sessionTermId) ?? 0) + 1);
    }
  }
  return { student, terms, forms: validForms, referenceCounts, hasUnmappedHistory };
}
