import { z } from "zod";

export const ASSESSMENT_WORKBOOK_SCHEMA_VERSION = 1 as const;
export const ASSESSMENT_WORKBOOK_VISIBLE_SHEET = "Assessment Form";
export const ASSESSMENT_WORKBOOK_METADATA_SHEET = "__school_clerk";

export const assessmentWorkbookStudentSchema = z.object({
  studentId: z.string().min(1),
  studentTermFormId: z.string().min(1),
  displayName: z.string().min(1),
  gender: z.enum(["Male", "Female"]),
});

export const assessmentWorkbookColumnSchema = z.object({
  key: z.string().min(1),
  departmentSubjectId: z.string().min(1),
  subjectTitle: z.string().min(1),
  assessmentId: z.number().int().positive().nullable(),
  assessmentTitle: z.string().min(1).nullable(),
  obtainable: z.number().nonnegative().nullable(),
  originalScores: z.record(z.number().nullable()),
});

export const generateAssessmentWorkbookInputSchema = z.object({
  exportId: z.string().min(1),
  tenantId: z.string().min(1),
  termId: z.string().min(1),
  termLabel: z.string().min(1),
  classroomId: z.string().min(1),
  classroomLabel: z.string().min(1),
  direction: z.enum(["ltr", "rtl"]),
  generatedAt: z.string().datetime(),
  students: z.array(assessmentWorkbookStudentSchema).min(1),
  columns: z.array(assessmentWorkbookColumnSchema).min(1),
});

export type GenerateAssessmentWorkbookInput = z.infer<
  typeof generateAssessmentWorkbookInputSchema
>;

export const assessmentWorkbookMetadataSchema = z.object({
  schemaVersion: z.literal(ASSESSMENT_WORKBOOK_SCHEMA_VERSION),
  identity: z.object({
    exportId: z.string().min(1),
    tenantId: z.string().min(1),
    termId: z.string().min(1),
    classroomId: z.string().min(1),
    generatedAt: z.string().datetime(),
    direction: z.enum(["ltr", "rtl"]),
  }),
  visibleSheetName: z.literal(ASSESSMENT_WORKBOOK_VISIBLE_SHEET),
  studentRows: z.array(
    assessmentWorkbookStudentSchema.extend({
      row: z.number().int().positive(),
    }),
  ),
  columns: z.array(
    assessmentWorkbookColumnSchema.omit({ originalScores: true }).extend({
      column: z.number().int().positive(),
      originalScores: z.record(z.number().nullable()),
    }),
  ),
  studentIdColumn: z.number().int().positive(),
});

export type AssessmentWorkbookMetadata = z.infer<
  typeof assessmentWorkbookMetadataSchema
>;

export type ParsedAssessmentWorkbook = {
  identity: AssessmentWorkbookMetadata["identity"];
  metadata: AssessmentWorkbookMetadata;
  scoreCells: Array<{
    studentTermFormId: string;
    columnKey: string;
    uploaded: unknown;
  }>;
};

export const assessmentWorkbookColumnResolutionSchema = z.discriminatedUnion(
  "kind",
  [
    z.object({
      kind: z.literal("existing"),
      assessmentId: z.number().int().positive(),
    }),
    z.object({
      kind: z.literal("create"),
      title: z.string().trim().min(1).max(120),
      obtainable: z.number().positive(),
      percentageObtainable: z.number().min(0).max(100).default(0),
    }),
  ],
);

export const assessmentWorkbookResolutionsSchema = z.record(
  assessmentWorkbookColumnResolutionSchema,
);

export type AssessmentWorkbookColumnResolution = z.infer<
  typeof assessmentWorkbookColumnResolutionSchema
>;

export const assessmentWorkbookDownloadSchema = z.object({
  departmentId: z.string().min(1),
  sessionTermId: z.string().min(1),
  direction: z.enum(["ltr", "rtl"]),
  subjects: z
    .array(
      z.object({
        departmentSubjectId: z.string().min(1),
        columns: z
          .array(
            z.discriminatedUnion("kind", [
              z.object({ kind: z.literal("bare") }),
              z.object({
                kind: z.literal("assessment"),
                assessmentId: z.number().int().positive(),
              }),
            ]),
          )
          .min(1),
      }),
    )
    .min(1),
});

export const assessmentWorkbookUploadSchema = z.object({
  fileBase64: z.string().min(1),
  resolutions: assessmentWorkbookResolutionsSchema.default({}),
});

export const assessmentWorkbookApplySchema =
  assessmentWorkbookUploadSchema.extend({
    idempotencyKey: z.string().trim().min(8).max(120),
    previewToken: z.string().regex(/^[a-f0-9]{64}$/),
  });

export type AssessmentWorkbookDownloadInput = z.infer<
  typeof assessmentWorkbookDownloadSchema
>;
export type AssessmentWorkbookUploadInput = z.infer<
  typeof assessmentWorkbookUploadSchema
>;
export type AssessmentWorkbookApplyInput = z.infer<
  typeof assessmentWorkbookApplySchema
>;
