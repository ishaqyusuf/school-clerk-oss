import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { TRPCContext } from "@api/trpc/init";
import {
  assessmentWorkbookApplySchema,
  assessmentWorkbookDownloadSchema,
  assessmentWorkbookUploadSchema,
  buildAssessmentWorkbookPreview,
  type AssessmentWorkbookApplyInput,
  type AssessmentWorkbookDownloadInput,
  type AssessmentWorkbookPreview,
  type AssessmentWorkbookUploadInput,
  type ParsedAssessmentWorkbook,
} from "@school-clerk/assessment-workbooks";
import {
  generateAssessmentWorkbook,
  parseAssessmentWorkbook,
} from "@school-clerk/assessment-workbooks/server";
import { classroomDisplayName } from "@school-clerk/utils";
import { TRPCError } from "@trpc/server";

import {
  assertTeacherCanAccessClassroomDepartment,
  assertTeacherCanAccessDepartmentSubject,
} from "../../lib/teacher-authorization";
import { studentDisplayName } from "./enrollment-query";

export {
  assessmentWorkbookApplySchema,
  assessmentWorkbookDownloadSchema,
  assessmentWorkbookUploadSchema,
};

function requireSchoolId(ctx: TRPCContext) {
  if (!ctx.profile.schoolId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Select a school before working with assessment workbooks.",
    });
  }
  return ctx.profile.schoolId;
}

function assertAssessmentWorkbookRole(ctx: TRPCContext) {
  const role = ctx.currentUser?.role;
  if (role !== "Admin" && role !== "ADMIN" && role !== "Teacher") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Only administrators and assigned teachers can use assessment workbooks.",
    });
  }
}

function signingKey() {
  const configured = process.env.ASSESSMENT_WORKBOOK_SIGNING_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Assessment workbook signing is not configured.",
    });
  }
  return "school-clerk-local-assessment-workbook-signing-key";
}

function decodeWorkbook(fileBase64: string) {
  if (fileBase64.length > 14 * 1024 * 1024) {
    throw new TRPCError({
      code: "PAYLOAD_TOO_LARGE",
      message: "Workbook exceeds the 10 MB upload limit.",
    });
  }
  try {
    return Uint8Array.from(Buffer.from(fileBase64, "base64"));
  } catch {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The uploaded workbook could not be read.",
    });
  }
}

function workbookDigest(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function previewConfirmationToken({
  bytes,
  resolutions,
  preview,
}: {
  bytes: Uint8Array;
  resolutions: AssessmentWorkbookUploadInput["resolutions"];
  preview: AssessmentWorkbookPreview;
}) {
  const normalizedResolutions = Object.fromEntries(
    Object.entries(resolutions).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  return createHmac("sha256", signingKey())
    .update(
      JSON.stringify({
        fileDigest: workbookDigest(bytes),
        resolutions: normalizedResolutions,
        plan: {
          identity: preview.identity,
          assessmentCreations: preview.assessmentCreations,
          changes: preview.changes,
          blockers: preview.blockers,
          summary: preview.summary,
        },
      }),
    )
    .digest("hex");
}

function confirmationTokensMatch(actual: string, expected: string) {
  const actualBytes = Buffer.from(actual, "hex");
  const expectedBytes = Buffer.from(expected, "hex");
  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

function safeFilePart(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "classroom"
  );
}

async function loadWorkbookScope(
  ctx: TRPCContext,
  departmentId: string,
  sessionTermId: string,
) {
  const schoolProfileId = requireSchoolId(ctx);
  await assertTeacherCanAccessClassroomDepartment(
    ctx,
    departmentId,
    sessionTermId,
  );

  const department = await ctx.db.classRoomDepartment.findFirst({
    where: {
      id: departmentId,
      deletedAt: null,
      schoolProfileId,
    },
    select: {
      id: true,
      departmentName: true,
      classRoom: {
        select: {
          name: true,
        },
      },
      subjects: {
        where: {
          deletedAt: null,
          sessionTermId,
        },
        orderBy: { id: "asc" },
        select: {
          id: true,
          subject: {
            select: { title: true },
          },
          assessments: {
            where: {
              deletedAt: null,
              isGroup: false,
            },
            orderBy: [{ index: "asc" }, { id: "asc" }],
            select: {
              id: true,
              title: true,
              obtainable: true,
              percentageObtainable: true,
              parentAssessment: {
                select: { title: true },
              },
              assessmentResults: {
                where: {
                  deletedAt: null,
                  studentTermForm: { sessionTermId },
                },
                select: {
                  obtained: true,
                  studentTermFormId: true,
                },
              },
            },
          },
        },
      },
      studentTermForms: {
        where: {
          sessionTermId,
          deletedAt: null,
          student: { deletedAt: null },
        },
        orderBy: [{ student: { gender: "asc" } }, { student: { name: "asc" } }],
        select: {
          id: true,
          student: {
            select: {
              id: true,
              gender: true,
              name: true,
              otherName: true,
              surname: true,
            },
          },
        },
      },
    },
  });
  const term = await ctx.db.sessionTerm.findFirst({
    where: {
      id: sessionTermId,
      deletedAt: null,
      schoolId: schoolProfileId,
    },
    select: {
      title: true,
      session: { select: { title: true } },
    },
  });

  if (!department || !term) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The selected classroom or term is no longer available.",
    });
  }

  return {
    schoolProfileId,
    department,
    term,
    classroomLabel: classroomDisplayName({
      className: department.classRoom?.name,
      departmentName: department.departmentName,
    }),
    termLabel: [term.session?.title, term.title].filter(Boolean).join(" • "),
  };
}

function assessmentTitle(assessment: {
  title: string;
  parentAssessment: { title: string } | null;
}) {
  return assessment.parentAssessment?.title
    ? `${assessment.parentAssessment.title} - ${assessment.title}`
    : assessment.title;
}

export async function downloadAssessmentWorkbook(
  ctx: TRPCContext,
  rawInput: AssessmentWorkbookDownloadInput,
) {
  assertAssessmentWorkbookRole(ctx);
  const input = assessmentWorkbookDownloadSchema.parse(rawInput);
  const scope = await loadWorkbookScope(
    ctx,
    input.departmentId,
    input.sessionTermId,
  );
  const selectedSubjects = new Map(
    input.subjects.map((subject) => [
      subject.departmentSubjectId,
      subject.columns,
    ]),
  );
  const accessibleSubjects = new Map(
    scope.department.subjects.map((subject) => [subject.id, subject]),
  );

  for (const selection of input.subjects) {
    await assertTeacherCanAccessDepartmentSubject(
      ctx,
      selection.departmentSubjectId,
      input.sessionTermId,
    );
    const subject = accessibleSubjects.get(selection.departmentSubjectId);
    if (!subject) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "One of the selected subjects is not available to you.",
      });
    }
    const bareColumns = selection.columns.filter(
      (column) => column.kind === "bare",
    );
    if (bareColumns.length && selection.columns.length !== 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "A subject-only column cannot be combined with assessment columns for the same subject.",
      });
    }
    const selectedIds = selection.columns.flatMap((column) =>
      column.kind === "assessment" ? [column.assessmentId] : [],
    );
    if (
      new Set(selectedIds).size !== selectedIds.length ||
      selectedIds.some(
        (id) => !subject.assessments.some((assessment) => assessment.id === id),
      )
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `One or more selected assessments are invalid for ${subject.subject?.title ?? "the subject"}.`,
      });
    }
  }

  const students = scope.department.studentTermForms.map((form) => {
    if (
      !form.student ||
      (form.student.gender !== "Male" && form.student.gender !== "Female")
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Every enrolled student must have Male or Female selected before this workbook can be downloaded.",
      });
    }
    return {
      studentId: form.student.id,
      studentTermFormId: form.id,
      displayName: studentDisplayName(form.student),
      gender: form.student.gender,
    };
  });
  if (!students.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This classroom has no enrolled students for the selected term.",
    });
  }

  const exportRecord = await ctx.db.assessmentWorkbookExport.create({
    data: {
      schoolProfileId: scope.schoolProfileId,
      sessionTermId: input.sessionTermId,
      classRoomDepartmentId: input.departmentId,
      schemaVersion: 1,
      createdByUserId: ctx.currentUser?.id,
      createdByName: ctx.currentUser?.name,
    },
    select: { id: true, createdAt: true },
  });

  const columns = scope.department.subjects.flatMap((subject) => {
    const selections = selectedSubjects.get(subject.id);
    if (!selections) return [];
    const subjectTitle = subject.subject?.title ?? "Subject";

    return selections.map((selection) => {
      if (selection.kind === "bare") {
        return {
          key: `bare:${subject.id}`,
          departmentSubjectId: subject.id,
          subjectTitle,
          assessmentId: null,
          assessmentTitle: null,
          obtainable: null,
          originalScores: Object.fromEntries(
            students.map((student) => [student.studentTermFormId, null]),
          ),
        };
      }
      const assessment = subject.assessments.find(
        (candidate) => candidate.id === selection.assessmentId,
      )!;
      return {
        key: `assessment:${assessment.id}`,
        departmentSubjectId: subject.id,
        subjectTitle,
        assessmentId: assessment.id,
        assessmentTitle: assessmentTitle(assessment),
        obtainable: assessment.obtainable,
        originalScores: Object.fromEntries(
          students.map((student) => [
            student.studentTermFormId,
            assessment.assessmentResults.find(
              (result) =>
                result.studentTermFormId === student.studentTermFormId,
            )?.obtained ?? null,
          ]),
        ),
      };
    });
  });

  const bytes = await generateAssessmentWorkbook(
    {
      exportId: exportRecord.id,
      tenantId: scope.schoolProfileId,
      termId: input.sessionTermId,
      termLabel: scope.termLabel || "Term",
      classroomId: input.departmentId,
      classroomLabel: scope.classroomLabel,
      direction: input.direction,
      generatedAt: exportRecord.createdAt.toISOString(),
      students,
      columns,
    },
    { signingKey: signingKey() },
  );

  await ctx.db.activity.create({
    data: {
      userId: ctx.currentUser?.id ?? "system",
      author: ctx.currentUser?.name ?? "School Clerk",
      source: "user",
      type: "assessment_workbook_downloaded",
      title: "Assessment workbook downloaded",
      description: `${scope.classroomLabel} • ${scope.termLabel}`,
      schoolProfileId: scope.schoolProfileId,
      meta: {
        exportId: exportRecord.id,
        subjectCount: input.subjects.length,
        columnCount: columns.length,
        studentCount: students.length,
        direction: input.direction,
      },
    },
  });

  return {
    exportId: exportRecord.id,
    fileName: `${safeFilePart(scope.classroomLabel)}-${safeFilePart(scope.termLabel)}-assessment-workbook.xlsx`,
    fileBase64: Buffer.from(bytes).toString("base64"),
  };
}

async function parseAndAuthorizeWorkbook(ctx: TRPCContext, fileBase64: string) {
  assertAssessmentWorkbookRole(ctx);
  const schoolProfileId = requireSchoolId(ctx);
  const bytes = decodeWorkbook(fileBase64);
  let workbook: ParsedAssessmentWorkbook;
  try {
    workbook = await parseAssessmentWorkbook(bytes, {
      signingKey: signingKey(),
    });
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        error instanceof Error
          ? error.message
          : "The uploaded workbook is invalid.",
    });
  }
  if (workbook.identity.tenantId !== schoolProfileId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This workbook belongs to a different school.",
    });
  }

  const exportRecord = await ctx.db.assessmentWorkbookExport.findFirst({
    where: {
      id: workbook.identity.exportId,
      schoolProfileId,
      sessionTermId: workbook.identity.termId,
      classRoomDepartmentId: workbook.identity.classroomId,
      revokedAt: null,
    },
    select: { id: true },
  });
  if (!exportRecord) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This School Clerk workbook is no longer valid.",
    });
  }
  await assertTeacherCanAccessClassroomDepartment(
    ctx,
    workbook.identity.classroomId,
    workbook.identity.termId,
  );
  await Promise.all(
    workbook.metadata.columns.map((column) =>
      assertTeacherCanAccessDepartmentSubject(
        ctx,
        column.departmentSubjectId,
        workbook.identity.termId,
      ),
    ),
  );
  return { workbook, bytes, schoolProfileId };
}

async function prepareAssessmentWorkbookPreview(
  ctx: TRPCContext,
  input: AssessmentWorkbookUploadInput,
) {
  const { workbook, bytes, schoolProfileId } = await parseAndAuthorizeWorkbook(
    ctx,
    input.fileBase64,
  );
  const scope = await loadWorkbookScope(
    ctx,
    workbook.identity.classroomId,
    workbook.identity.termId,
  );

  const preview = buildAssessmentWorkbookPreview({
    workbook,
    resolutions: input.resolutions,
    live: {
      students: scope.department.studentTermForms.flatMap((form) =>
        form.student
          ? [
              {
                studentId: form.student.id,
                studentTermFormId: form.id,
                displayName: studentDisplayName(form.student),
              },
            ]
          : [],
      ),
      subjects: scope.department.subjects.map((subject) => ({
        departmentSubjectId: subject.id,
        subjectTitle: subject.subject?.title ?? "Subject",
        assessments: subject.assessments.map((assessment) => ({
          id: assessment.id,
          title: assessmentTitle(assessment),
          obtainable: assessment.obtainable,
          currentScores: Object.fromEntries(
            scope.department.studentTermForms.map((form) => [
              form.id,
              assessment.assessmentResults.find(
                (result) => result.studentTermFormId === form.id,
              )?.obtained ?? null,
            ]),
          ),
        })),
      })),
    },
  });

  return {
    preview,
    workbook,
    bytes,
    schoolProfileId,
    classroomLabel: scope.classroomLabel,
    termLabel: scope.termLabel,
  };
}

export async function previewAssessmentWorkbook(
  ctx: TRPCContext,
  rawInput: AssessmentWorkbookUploadInput,
): Promise<
  AssessmentWorkbookPreview & {
    classroomLabel: string;
    termLabel: string;
    previewToken: string;
  }
> {
  const input = assessmentWorkbookUploadSchema.parse(rawInput);
  const prepared = await prepareAssessmentWorkbookPreview(ctx, input);
  return {
    ...prepared.preview,
    classroomLabel: prepared.classroomLabel,
    termLabel: prepared.termLabel,
    previewToken: previewConfirmationToken({
      bytes: prepared.bytes,
      resolutions: input.resolutions,
      preview: prepared.preview,
    }),
  };
}

export async function applyAssessmentWorkbook(
  ctx: TRPCContext,
  rawInput: AssessmentWorkbookApplyInput,
) {
  assertAssessmentWorkbookRole(ctx);
  const input = assessmentWorkbookApplySchema.parse(rawInput);
  const fileBytes = decodeWorkbook(input.fileBase64);
  const fileDigest = workbookDigest(fileBytes);
  await parseAndAuthorizeWorkbook(ctx, input.fileBase64);

  return ctx.db.$transaction(
    async (tx) => {
      const transactionContext = { ...ctx, db: tx } as TRPCContext;
      const schoolProfileId = requireSchoolId(ctx);
      const existing = await tx.assessmentWorkbookImport.findUnique({
        where: {
          schoolProfileId_idempotencyKey: {
            schoolProfileId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (existing) {
        if (existing.fileDigest !== fileDigest) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "This import confirmation was already used for a different file.",
          });
        }
        return {
          importId: existing.id,
          alreadyApplied: true,
          summary: existing.summary as AssessmentWorkbookPreview["summary"],
          createdAssessmentIds: existing.createdAssessmentIds,
        };
      }

      const prepared = await prepareAssessmentWorkbookPreview(
        transactionContext,
        input,
      );
      if (prepared.preview.blockers.length) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "The workbook changed or still has unresolved items. Review it again before applying.",
          cause: prepared.preview.blockers,
        });
      }
      const expectedPreviewToken = previewConfirmationToken({
        bytes: prepared.bytes,
        resolutions: input.resolutions,
        preview: prepared.preview,
      });
      if (!confirmationTokensMatch(input.previewToken, expectedPreviewToken)) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "This workbook preview is no longer current. Review the workbook again before applying it.",
        });
      }

      const createdAssessmentByColumn = new Map<string, number>();
      for (const column of prepared.preview.columns) {
        if (column.resolution?.kind !== "create") continue;
        const maxIndex = await tx.classroomSubjectAssessment.aggregate({
          where: {
            departmentSubjectId: column.departmentSubjectId,
            deletedAt: null,
            parentAssessmentId: null,
          },
          _max: { index: true },
        });
        const assessment = await tx.classroomSubjectAssessment.create({
          data: {
            title: column.resolution.title,
            obtainable: column.resolution.obtainable,
            percentageObtainable: column.resolution.percentageObtainable ?? 0,
            index: (maxIndex._max.index ?? -1) + 1,
            departmentSubjectId: column.departmentSubjectId,
            isGroup: false,
            printMode: "EXPANDED",
            parentAssessmentId: null,
          },
          select: { id: true },
        });
        createdAssessmentByColumn.set(column.key, assessment.id);
      }

      for (const change of prepared.preview.changes) {
        if (change.status !== "create" && change.status !== "update") continue;
        const assessmentId =
          change.assessmentId ??
          createdAssessmentByColumn.get(change.columnKey);
        if (!assessmentId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "The assessment mapping could not be applied.",
          });
        }
        await tx.studentAssessmentRecord.upsert({
          where: {
            studentId_studentTermFormId_classSubjectAssessmentId: {
              studentId: change.studentId,
              studentTermFormId: change.studentTermFormId,
              classSubjectAssessmentId: assessmentId,
            },
          },
          update: {
            obtained: change.uploaded,
            deletedAt: null,
          },
          create: {
            studentId: change.studentId,
            studentTermFormId: change.studentTermFormId,
            classSubjectAssessmentId: assessmentId,
            obtained: change.uploaded,
          },
        });
      }

      const createdAssessmentIds = Array.from(
        createdAssessmentByColumn.values(),
      );
      const imported = await tx.assessmentWorkbookImport.create({
        data: {
          exportId: prepared.workbook.identity.exportId,
          schoolProfileId: prepared.schoolProfileId,
          sessionTermId: prepared.workbook.identity.termId,
          classRoomDepartmentId: prepared.workbook.identity.classroomId,
          idempotencyKey: input.idempotencyKey,
          fileDigest,
          summary: prepared.preview.summary,
          createdAssessmentIds,
          createdByUserId: ctx.currentUser?.id,
          createdByName: ctx.currentUser?.name,
        },
        select: { id: true },
      });
      await tx.activity.create({
        data: {
          userId: ctx.currentUser?.id ?? "system",
          author: ctx.currentUser?.name ?? "School Clerk",
          source: "user",
          type: "assessment_workbook_imported",
          title: "Assessment workbook imported",
          description: `${prepared.classroomLabel} • ${prepared.termLabel}`,
          schoolProfileId: prepared.schoolProfileId,
          meta: {
            importId: imported.id,
            exportId: prepared.workbook.identity.exportId,
            summary: prepared.preview.summary,
            createdAssessmentIds,
          },
        },
      });

      return {
        importId: imported.id,
        alreadyApplied: false,
        summary: prepared.preview.summary,
        createdAssessmentIds,
      };
    },
    { isolationLevel: "Serializable" },
  );
}
