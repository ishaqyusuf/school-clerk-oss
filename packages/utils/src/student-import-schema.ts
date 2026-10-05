import { z } from "zod";
import { STUDENT_TERM_ADMISSION_TYPES } from "./constants";

export const STUDENT_IMPORT_PREVIEW_ROW_LIMIT = 500;
const referenceId = z.string().trim().min(1).max(200);
export const verifyStudentImportSchema = z.object({
  classroomDepartmentId: referenceId.optional().nullable(),
  rows: z.array(z.object({
    lineNumber: z.number().int().nonnegative(),
    originalText: z.string().max(2_000),
    name: z.string().trim().min(1).max(200),
    surname: z.string().trim().max(200),
    otherName: z.string().trim().max(200).optional().nullable(),
    gender: z.enum(["Male", "Female"]).optional().nullable(),
    classroomDepartmentId: referenceId.optional().nullable(),
  })).min(1).max(STUDENT_IMPORT_PREVIEW_ROW_LIMIT),
}).superRefine((input, context) => {
  if (new Set(input.rows.map((row) => row.lineNumber)).size !== input.rows.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["rows"], message: "Each preview row must have a distinct line number." });
  }
});
export type VerifyStudentImportSchema = z.infer<typeof verifyStudentImportSchema>;

export const studentImportRowSchema = z.object({
  lineNumber: z.number(),
  name: z.string().min(1),
  surname: z.string().min(1),
  otherName: z.string().optional().nullable(),
  gender: z.enum(["Male", "Female"]),
  classroomDepartmentId: z.string().optional().nullable(),
  action: z.enum(["import_new", "keep_match", "update_match_with_name"]),
  existingStudentId: z.string().optional().nullable(),
  admissionType: z.enum(STUDENT_TERM_ADMISSION_TYPES).optional(),
});

export const executeStudentImportSchema = z.object({
  classroomDepartmentId: z.string().optional().nullable(),
  rows: z.array(studentImportRowSchema),
});

export type StudentImportRow = z.infer<typeof studentImportRowSchema>;
export type ExecuteStudentImport = z.infer<typeof executeStudentImportSchema>;
export type ImportRowResult = {
  lineNumber: number;
  action: string;
  status: "created" | "kept" | "updated" | "skipped" | "failed";
  studentId?: string | null;
  termSheetCreated?: boolean;
  reason?: string;
};
export type ExecuteStudentImportResult = {
  createdStudents: number;
  keptMatches: number;
  updatedMatches: number;
  termSheetsCreated: number;
  skippedRows: number;
  failedRows: number;
  rows: ImportRowResult[];
};
