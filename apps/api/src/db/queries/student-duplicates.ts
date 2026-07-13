import type { TRPCContext } from "@api/trpc/init";
import { txContext } from "@api/utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const STUDENT_MANAGEMENT_ROLES = new Set(["ADMIN", "Admin", "Registrar"]);

function requireStudentManagementAccess(ctx: TRPCContext) {
  const schoolProfileId = ctx.profile.schoolId;

  if (!schoolProfileId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Active school context is required",
    });
  }

  const role = ctx.currentUser?.role;
  if (!role || !STUDENT_MANAGEMENT_ROLES.has(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to manage student records.",
    });
  }

  return { schoolProfileId };
}

function normalizeArabic(str: string): string {
  if (!str) return "";
  str = str
    .normalize("NFC")
    .replace(
      /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640]/g,
      "",
    );
  const map: Record<string, string> = {
    أ: "ا",
    إ: "ا",
    آ: "ا",
    ٱ: "ا",
    ى: "ي",
    ئ: "ي",
    ؤ: "w",
    ة: "ه",
  };
  str = str.replace(/[\u0621-\u06D3\u06FA-\u06FF]/g, (ch) => map[ch] || ch);
  return str.replace(/\s+/g, " ").trim();
}

function normalizeName(str: string): string {
  return normalizeArabic(str).toLowerCase().trim();
}

export function normalizeStudentDuplicateNameKey(input: {
  name?: string | null;
  surname?: string | null;
  otherName?: string | null;
}) {
  return normalizeName(
    [input.name, input.surname, input.otherName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" "),
  ).replace(/\s+/g, " ");
}

async function findExactDuplicateStudentInClassTerm(
  tx: any,
  input: {
    schoolProfileId?: string | null;
    sessionTermId?: string | null;
    classroomDepartmentId?: string | null;
    name: string;
    surname?: string | null;
    otherName?: string | null;
    excludeStudentIds?: string[];
  },
) {
  if (
    !input.schoolProfileId ||
    !input.sessionTermId ||
    !input.classroomDepartmentId
  ) {
    return null;
  }

  const targetKey = normalizeStudentDuplicateNameKey(input);
  if (!targetKey) return null;

  const termForms = await tx.studentTermForm.findMany({
    where: {
      schoolProfileId: input.schoolProfileId,
      sessionTermId: input.sessionTermId,
      classroomDepartmentId: input.classroomDepartmentId,
      deletedAt: null,
      student: {
        deletedAt: null,
        schoolProfileId: input.schoolProfileId,
        ...(input.excludeStudentIds?.length
          ? { id: { notIn: input.excludeStudentIds } }
          : {}),
      },
    },
    select: {
      student: {
        select: {
          id: true,
          name: true,
          surname: true,
          otherName: true,
        },
      },
    },
  });

  return (
    termForms.find(
      (termForm) =>
        termForm.student &&
        normalizeStudentDuplicateNameKey(termForm.student) === targetKey,
    )?.student ?? null
  );
}

export async function assertNoExactDuplicateStudentInClassTerm(
  tx: any,
  input: Parameters<typeof findExactDuplicateStudentInClassTerm>[1],
) {
  const duplicate = await findExactDuplicateStudentInClassTerm(tx, input);

  if (duplicate) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "A student with this exact name already exists in the selected class for this term. Add or correct other name, or merge the duplicate records first.",
    });
  }
}

export const studentDuplicateScopeSchema = z.object({
  classroomDepartmentId: z.string().optional().nullable(),
  sessionTermId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
});
export type StudentDuplicateScope = z.infer<typeof studentDuplicateScopeSchema>;

export const studentDuplicateMergePreviewSchema =
  studentDuplicateScopeSchema.extend({
    survivorStudentId: z.string(),
    duplicateStudentIds: z.array(z.string()).min(1),
  });
export type StudentDuplicateMergePreviewInput = z.infer<
  typeof studentDuplicateMergePreviewSchema
>;

export type StudentDuplicateMember = {
  studentId: string;
  studentTermFormId: string;
  studentSessionFormId: string;
  displayName: string;
  name: string;
  surname: string | null;
  otherName: string | null;
  gender: string | null;
  createdAt: Date | null;
  classroomDepartmentId: string | null;
  classroomName: string | null;
  sessionTermId: string | null;
  counts: {
    assessmentRecords: number;
    attendanceRecords: number;
    financeCharges: number;
    directAssessmentRecords: number;
    directFinanceCharges: number;
    financePayments: number;
    guardianLinks: number;
    sessionForms: number;
    termForms: number;
    historyScore: number;
  };
  isRecommendedSurvivor: boolean;
};

export type StudentDuplicateGroup = {
  key: string;
  normalizedName: string;
  classroomDepartmentId: string | null;
  classroomName: string | null;
  sessionTermId: string | null;
  memberCount: number;
  recommendedSurvivorId: string;
  members: StudentDuplicateMember[];
};

export type StudentDuplicateGroupsResult = {
  scope: {
    schoolProfileId: string;
    sessionTermId: string;
    classroomDepartmentId: string | null;
  };
  totalStudents: number;
  duplicateGroupCount: number;
  duplicateStudentCount: number;
  groups: StudentDuplicateGroup[];
};

export type StudentDuplicateMergePreview = {
  group: StudentDuplicateGroup;
  survivorStudentId: string;
  duplicateStudentIds: string[];
  primaryTermFormId: string;
  recordsToMove: {
    termForms: number;
    sessionForms: number;
    attendanceRecords: number;
    assessmentRecords: number;
    financeCharges: number;
    directFinancePayments: number;
    guardianLinks: number;
    enrollmentApplications: number;
  };
  conflicts: string[];
  canMerge: boolean;
};

type DuplicateTermFormRow = {
  id: string;
  studentSessionFormId: string;
  classroomDepartmentId: string | null;
  sessionTermId: string | null;
  createdAt: Date | null;
  classroomDepartment: {
    id: string;
    departmentName: string | null;
    classRoom: { name: string | null } | null;
  } | null;
  _count: {
    assessmentRecords: number;
    attendanceList: number;
    financeCharges: number;
  };
  student: {
    id: string;
    name: string;
    surname: string | null;
    otherName: string | null;
    gender: string | null;
    createdAt: Date | null;
    _count: {
      sessionForms: number;
      termForms: number;
      guardians: number;
      assessmentRecords: number;
      financeCharges: number;
      financePayments: number;
    };
  } | null;
};

function getStudentDuplicateDisplayName(input: {
  name?: string | null;
  surname?: string | null;
  otherName?: string | null;
}) {
  return [input.name, input.surname, input.otherName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

function getDuplicateHistoryScore(row: DuplicateTermFormRow) {
  const studentCounts = row.student?._count;
  return (
    row._count.assessmentRecords * 10 +
    row._count.attendanceList * 6 +
    row._count.financeCharges * 8 +
    (studentCounts?.assessmentRecords ?? 0) * 10 +
    (studentCounts?.financeCharges ?? 0) * 8 +
    (studentCounts?.financePayments ?? 0) * 8 +
    (studentCounts?.guardians ?? 0) * 3 +
    (studentCounts?.termForms ?? 0) * 2 +
    (studentCounts?.sessionForms ?? 0)
  );
}

function classroomDisplayLabel(
  classroomDepartment: DuplicateTermFormRow["classroomDepartment"],
) {
  return [classroomDepartment?.classRoom?.name, classroomDepartment?.departmentName]
    .filter(Boolean)
    .join(" ");
}

function mapDuplicateGroup(rows: DuplicateTermFormRow[]): StudentDuplicateGroup {
  const sortedRows = [...rows].sort((a, b) => {
    const scoreDelta = getDuplicateHistoryScore(b) - getDuplicateHistoryScore(a);
    if (scoreDelta !== 0) return scoreDelta;
    return (
      (a.student?.createdAt?.getTime() ?? 0) -
      (b.student?.createdAt?.getTime() ?? 0)
    );
  });
  const recommended = sortedRows[0]!;
  const normalizedName = normalizeStudentDuplicateNameKey(recommended.student ?? {});
  const classroomDepartment = recommended.classroomDepartment;
  const classroomName = classroomDisplayLabel(classroomDepartment) || null;
  const recommendedSurvivorId = recommended.student!.id;

  const members = sortedRows.map((row) => {
    const student = row.student!;
    const score = getDuplicateHistoryScore(row);
    return {
      studentId: student.id,
      studentTermFormId: row.id,
      studentSessionFormId: row.studentSessionFormId,
      displayName: getStudentDuplicateDisplayName(student),
      name: student.name,
      surname: student.surname,
      otherName: student.otherName,
      gender: student.gender,
      createdAt: student.createdAt,
      classroomDepartmentId: row.classroomDepartmentId,
      classroomName: classroomDisplayLabel(row.classroomDepartment) || null,
      sessionTermId: row.sessionTermId,
      counts: {
        assessmentRecords: row._count.assessmentRecords,
        attendanceRecords: row._count.attendanceList,
        financeCharges: row._count.financeCharges,
        directAssessmentRecords: student._count.assessmentRecords,
        directFinanceCharges: student._count.financeCharges,
        financePayments: student._count.financePayments,
        guardianLinks: student._count.guardians,
        sessionForms: student._count.sessionForms,
        termForms: student._count.termForms,
        historyScore: score,
      },
      isRecommendedSurvivor: student.id === recommendedSurvivorId,
    } satisfies StudentDuplicateMember;
  });

  return {
    key: `${recommended.sessionTermId ?? "term"}:${recommended.classroomDepartmentId ?? "classroom"}:${normalizedName}`,
    normalizedName,
    classroomDepartmentId: recommended.classroomDepartmentId,
    classroomName,
    sessionTermId: recommended.sessionTermId,
    memberCount: members.length,
    recommendedSurvivorId,
    members,
  };
}

async function getDuplicateTermFormRows(
  db: TRPCContext["db"],
  input: {
    schoolProfileId: string;
    sessionTermId: string;
    classroomDepartmentId?: string | null;
    studentIds?: string[];
  },
) {
  return (await db.studentTermForm.findMany({
    where: {
      schoolProfileId: input.schoolProfileId,
      sessionTermId: input.sessionTermId,
      deletedAt: null,
      ...(input.classroomDepartmentId
        ? { classroomDepartmentId: input.classroomDepartmentId }
        : {}),
      ...(input.studentIds?.length ? { studentId: { in: input.studentIds } } : {}),
      student: {
        deletedAt: null,
        schoolProfileId: input.schoolProfileId,
      },
    },
    select: {
      id: true,
      studentSessionFormId: true,
      classroomDepartmentId: true,
      sessionTermId: true,
      createdAt: true,
      classroomDepartment: {
        select: {
          id: true,
          departmentName: true,
          classRoom: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          assessmentRecords: true,
          attendanceList: true,
          financeCharges: true,
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          surname: true,
          otherName: true,
          gender: true,
          createdAt: true,
          _count: {
            select: {
              sessionForms: true,
              termForms: true,
              guardians: true,
              assessmentRecords: true,
              financeCharges: true,
              financePayments: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })) as DuplicateTermFormRow[];
}

export async function getStudentDuplicateGroups(
  ctx: TRPCContext,
  input: StudentDuplicateScope,
): Promise<StudentDuplicateGroupsResult> {
  const schoolProfileId = ctx.profile.schoolId;
  const sessionTermId = input.sessionTermId || ctx.profile.termId;

  if (!schoolProfileId || !sessionTermId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Active school and term are required to check duplicate students.",
    });
  }

  const rows = await getDuplicateTermFormRows(ctx.db, {
    schoolProfileId,
    sessionTermId,
    classroomDepartmentId: input.classroomDepartmentId,
  });

  const totalStudents = new Set(
    rows.map((row) => row.student?.id).filter(Boolean),
  ).size;
  const groupedRows = new Map<string, DuplicateTermFormRow[]>();

  for (const row of rows) {
    if (!row.student) continue;
    const nameKey = normalizeStudentDuplicateNameKey(row.student);
    if (!nameKey) continue;
    const key = `${row.sessionTermId ?? ""}:${row.classroomDepartmentId ?? ""}:${nameKey}`;
    const group = groupedRows.get(key) ?? [];
    group.push(row);
    groupedRows.set(key, group);
  }

  let groups = Array.from(groupedRows.values())
    .filter((group) => new Set(group.map((row) => row.student?.id)).size > 1)
    .map(mapDuplicateGroup);

  if (input.studentId) {
    groups = groups.filter((group) =>
      group.members.some((member) => member.studentId === input.studentId),
    );
  }

  return {
    scope: {
      schoolProfileId,
      sessionTermId,
      classroomDepartmentId: input.classroomDepartmentId ?? null,
    },
    totalStudents,
    duplicateGroupCount: groups.length,
    duplicateStudentCount: groups.reduce(
      (count, group) => count + group.memberCount,
      0,
    ),
    groups,
  };
}

async function findDuplicateMergeGroup(
  ctx: TRPCContext,
  input: StudentDuplicateMergePreviewInput,
) {
  const duplicateGroups = await getStudentDuplicateGroups(ctx, {
    classroomDepartmentId: input.classroomDepartmentId,
    sessionTermId: input.sessionTermId,
  });
  const requestedIds = new Set([
    input.survivorStudentId,
    ...input.duplicateStudentIds,
  ]);
  const group = duplicateGroups.groups.find((item) => {
    const groupIds = new Set(item.members.map((member) => member.studentId));
    return Array.from(requestedIds).every((id) => groupIds.has(id));
  });

  if (!group) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The selected students are no longer a duplicate group.",
    });
  }

  return group;
}

async function findAssessmentMergeConflicts(
  ctx: TRPCContext,
  input: {
    survivorStudentId: string;
    duplicateStudentIds: string[];
    primaryTermFormId: string;
    duplicateTermFormIds: string[];
  },
) {
  if (!input.duplicateTermFormIds.length) return [];

  const records = await ctx.db.studentAssessmentRecord.findMany({
    where: {
      deletedAt: null,
      classSubjectAssessmentId: { not: null },
      OR: [
        {
          studentId: input.survivorStudentId,
          studentTermFormId: input.primaryTermFormId,
        },
        {
          studentTermFormId: { in: input.duplicateTermFormIds },
        },
      ],
    },
    select: {
      id: true,
      classSubjectAssessmentId: true,
      studentId: true,
      studentTermFormId: true,
    },
  });

  const targetAssessmentIds = new Set<number>();
  const duplicateAssessmentIds = new Set<number>();

  for (const record of records) {
    if (!record.classSubjectAssessmentId) continue;
    if (
      record.studentId === input.survivorStudentId &&
      record.studentTermFormId === input.primaryTermFormId
    ) {
      targetAssessmentIds.add(record.classSubjectAssessmentId);
      continue;
    }

    if (duplicateAssessmentIds.has(record.classSubjectAssessmentId)) {
      return [
        "Multiple duplicate copies have records for the same assessment. Review scores before merging.",
      ];
    }
    duplicateAssessmentIds.add(record.classSubjectAssessmentId);
  }

  for (const assessmentId of duplicateAssessmentIds) {
    if (targetAssessmentIds.has(assessmentId)) {
      return [
        "The survivor and duplicate copy both have a record for the same assessment. Review scores before merging.",
      ];
    }
  }

  return [];
}

export async function previewStudentDuplicateMerge(
  ctx: TRPCContext,
  input: StudentDuplicateMergePreviewInput,
): Promise<StudentDuplicateMergePreview> {
  requireStudentManagementAccess(ctx);
  const group = await findDuplicateMergeGroup(ctx, input);
  const selectedMembers = group.members.filter((member) =>
    [input.survivorStudentId, ...input.duplicateStudentIds].includes(
      member.studentId,
    ),
  );
  const survivorMember = selectedMembers.find(
    (member) => member.studentId === input.survivorStudentId,
  );

  if (!survivorMember) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The selected survivor is no longer in this duplicate group.",
    });
  }

  const primaryMember = survivorMember;
  const duplicateMembers = selectedMembers.filter(
    (member) => member.studentId !== input.survivorStudentId,
  );
  const duplicateTermFormIds = duplicateMembers
    .map((member) => member.studentTermFormId)
    .filter((id) => id !== primaryMember.studentTermFormId);
  const conflicts: string[] = [];
  const membersWithAssessmentRecords = selectedMembers.filter(
    (member) => member.counts.assessmentRecords > 0,
  );
  const membersWithAttendanceRecords = selectedMembers.filter(
    (member) => member.counts.attendanceRecords > 0,
  );
  const membersWithFinanceCharges = selectedMembers.filter(
    (member) => member.counts.financeCharges > 0,
  );

  if (membersWithAssessmentRecords.length > 1) {
    conflicts.push(
      "Multiple duplicate copies have current-term assessment records. Review scores before merging.",
    );
  }

  if (membersWithAttendanceRecords.length > 1) {
    conflicts.push(
      "Multiple duplicate copies have current-term attendance records. Review attendance before merging.",
    );
  }

  if (membersWithFinanceCharges.length > 1) {
    conflicts.push(
      "Multiple duplicate copies have current-term finance charges. Review charges and payments before merging.",
    );
  }

  conflicts.push(
    ...(await findAssessmentMergeConflicts(ctx, {
      survivorStudentId: input.survivorStudentId,
      duplicateStudentIds: input.duplicateStudentIds,
      primaryTermFormId: primaryMember.studentTermFormId,
      duplicateTermFormIds,
    })),
  );

  return {
    group,
    survivorStudentId: input.survivorStudentId,
    duplicateStudentIds: input.duplicateStudentIds,
    primaryTermFormId: primaryMember.studentTermFormId,
    recordsToMove: {
      termForms: duplicateMembers.length,
      sessionForms: duplicateMembers.reduce(
        (count, member) => count + member.counts.sessionForms,
        0,
      ),
      attendanceRecords: duplicateMembers.reduce(
        (count, member) => count + member.counts.attendanceRecords,
        0,
      ),
      assessmentRecords: duplicateMembers.reduce(
        (count, member) =>
          count +
          member.counts.assessmentRecords +
          member.counts.directAssessmentRecords,
        0,
      ),
      financeCharges: duplicateMembers.reduce(
        (count, member) =>
          count + member.counts.financeCharges + member.counts.directFinanceCharges,
        0,
      ),
      directFinancePayments: duplicateMembers.reduce(
        (count, member) => count + member.counts.financePayments,
        0,
      ),
      guardianLinks: duplicateMembers.reduce(
        (count, member) => count + member.counts.guardianLinks,
        0,
      ),
      enrollmentApplications: 0,
    },
    conflicts,
    canMerge: conflicts.length === 0,
  };
}

async function mergeNotificationContacts(
  tx: any,
  input: {
    schoolProfileId: string;
    survivorStudentId: string;
    duplicateStudentIds: string[];
    deletedAt: Date;
  },
) {
  const contacts = await tx.notificationContact.findMany({
    where: {
      schoolProfileId: input.schoolProfileId,
      deletedAt: null,
      OR: [
        { studentId: input.survivorStudentId },
        { studentId: { in: input.duplicateStudentIds } },
      ],
    },
    select: {
      id: true,
      studentId: true,
    },
  });

  const survivorContact = contacts.find(
    (contact) => contact.studentId === input.survivorStudentId,
  );
  const duplicateContacts = contacts.filter((contact) =>
    input.duplicateStudentIds.includes(contact.studentId ?? ""),
  );

  if (!duplicateContacts.length) return;

  let targetContactId = survivorContact?.id;
  let redundantContacts = duplicateContacts;

  if (!targetContactId) {
    const [firstDuplicate, ...remainingContacts] = duplicateContacts;
    if (!firstDuplicate) return;
    await tx.notificationContact.update({
      where: { id: firstDuplicate.id },
      data: { studentId: input.survivorStudentId },
    });
    targetContactId = firstDuplicate.id;
    redundantContacts = remainingContacts;
  }

  for (const contact of redundantContacts) {
    const recipients = await tx.notificationRecipient.findMany({
      where: {
        recipientContactId: contact.id,
        deletedAt: null,
      },
      select: {
        notificationId: true,
        status: true,
        readAt: true,
      },
    });

    if (recipients.length) {
      await tx.notificationRecipient.createMany({
        data: recipients.map((recipient) => ({
          notificationId: recipient.notificationId,
          recipientContactId: targetContactId!,
          status: recipient.status,
          readAt: recipient.readAt,
        })),
        skipDuplicates: true,
      });
    }
  }

  if (redundantContacts.length) {
    await tx.notificationContact.updateMany({
      where: {
        id: { in: redundantContacts.map((contact) => contact.id) },
        schoolProfileId: input.schoolProfileId,
        deletedAt: null,
      },
      data: { deletedAt: input.deletedAt },
    });
  }
}

export async function mergeStudentDuplicates(
  ctx: TRPCContext,
  input: StudentDuplicateMergePreviewInput,
) {
  const { schoolProfileId } = requireStudentManagementAccess(ctx);

  return ctx.db.$transaction(async (tx) => {
    const txCtx = txContext(ctx, tx);
    const preview = await previewStudentDuplicateMerge(txCtx, input);

    if (!preview.canMerge) {
      throw new TRPCError({
        code: "CONFLICT",
        message: preview.conflicts[0] ?? "Duplicate records need review before merging.",
      });
    }

    const duplicateStudentIds = input.duplicateStudentIds.filter(
      (id) => id !== input.survivorStudentId,
    );
    const duplicateMembers = preview.group.members.filter((member) =>
      duplicateStudentIds.includes(member.studentId),
    );
    const duplicateTermFormIds = duplicateMembers
      .map((member) => member.studentTermFormId)
      .filter((id) => id !== preview.primaryTermFormId);
    const deletedAt = new Date();

    await tx.studentTermForm.updateMany({
      where: {
        id: preview.primaryTermFormId,
        schoolProfileId,
        deletedAt: null,
      },
      data: {
        studentId: input.survivorStudentId,
        deletedAt: null,
      },
    });

    if (duplicateTermFormIds.length) {
      await tx.studentAttendance.updateMany({
        where: {
          studentTermFormId: { in: duplicateTermFormIds },
          schoolProfileId,
          deletedAt: null,
        },
        data: {
          studentTermFormId: preview.primaryTermFormId,
        },
      });

      await tx.studentAssessmentRecord.updateMany({
        where: {
          studentTermFormId: { in: duplicateTermFormIds },
          deletedAt: null,
        },
        data: {
          studentTermFormId: preview.primaryTermFormId,
          studentId: input.survivorStudentId,
        },
      });

      await tx.financeCharge.updateMany({
        where: {
          studentTermFormId: { in: duplicateTermFormIds },
          schoolProfileId,
          deletedAt: null,
        },
        data: {
          studentTermFormId: preview.primaryTermFormId,
          studentId: input.survivorStudentId,
        },
      });

      await tx.enrollmentApplication.updateMany({
        where: {
          acceptedTermFormId: { in: duplicateTermFormIds },
          schoolProfileId,
          deletedAt: null,
        },
        data: {
          acceptedTermFormId: preview.primaryTermFormId,
          acceptedStudentId: input.survivorStudentId,
        },
      });

      await tx.studentTermForm.updateMany({
        where: {
          id: { in: duplicateTermFormIds },
          schoolProfileId,
          deletedAt: null,
        },
        data: {
          deletedAt,
          studentId: input.survivorStudentId,
        },
      });
    }

    await mergeNotificationContacts(tx, {
      schoolProfileId,
      survivorStudentId: input.survivorStudentId,
      duplicateStudentIds,
      deletedAt,
    });

    await Promise.all([
      tx.studentSessionForm.updateMany({
        where: {
          studentId: { in: duplicateStudentIds },
          schoolProfileId,
          deletedAt: null,
        },
        data: { studentId: input.survivorStudentId },
      }),
      tx.studentAssessmentRecord.updateMany({
        where: {
          studentId: { in: duplicateStudentIds },
          deletedAt: null,
        },
        data: { studentId: input.survivorStudentId },
      }),
      tx.financeCharge.updateMany({
        where: {
          studentId: { in: duplicateStudentIds },
          schoolProfileId,
          deletedAt: null,
        },
        data: { studentId: input.survivorStudentId },
      }),
      tx.financePayment.updateMany({
        where: {
          studentId: { in: duplicateStudentIds },
          schoolProfileId,
          deletedAt: null,
        },
        data: { studentId: input.survivorStudentId },
      }),
      tx.studentGuardians.updateMany({
        where: {
          studentId: { in: duplicateStudentIds },
          deletedAt: null,
        },
        data: { studentId: input.survivorStudentId },
      }),
      tx.enrollmentApplication.updateMany({
        where: {
          acceptedStudentId: { in: duplicateStudentIds },
          schoolProfileId,
          deletedAt: null,
        },
        data: { acceptedStudentId: input.survivorStudentId },
      }),
    ]);

    await tx.students.updateMany({
      where: {
        id: { in: duplicateStudentIds },
        schoolProfileId,
        deletedAt: null,
      },
      data: { deletedAt },
    });

    return {
      success: true,
      survivorStudentId: input.survivorStudentId,
      mergedStudentIds: duplicateStudentIds,
      primaryTermFormId: preview.primaryTermFormId,
      recordsMoved: preview.recordsToMove,
    };
  });
}
