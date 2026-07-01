import { z } from "zod";
import type { AdmissionLetterTemplatePayload } from "../admission-letter";
import type { ResultTemplatePayload } from "../result";

const nullableText = z.string().nullable().optional();
const optionalText = z.string().optional();

export const admissionLetterPayloadSchema = z.object({
  applicationReference: nullableText,
  approvedAt: nullableText,
  classroomName: nullableText,
  parentName: nullableText,
  passportPhotoUrl: nullableText,
  payment: z
    .object({
      amount: nullableText,
      dueAt: nullableText,
      instructions: nullableText,
      label: nullableText,
      link: nullableText,
      required: z.boolean(),
    })
    .nullable()
    .optional(),
  schoolAddress: nullableText,
  schoolName: z.string().min(1),
  sessionLabel: nullableText,
  studentName: z.string().min(1),
}) satisfies z.ZodType<AdmissionLetterTemplatePayload>;

const resultTableSchema = z.object({
  columns: z.array(
    z.object({
      label: optionalText,
      subLabel: optionalText,
    }),
  ),
  rows: z.array(
    z.object({
      columns: z.array(
        z.object({
          value: z.union([z.string(), z.number()]).nullable().optional(),
        }),
      ),
    }),
  ),
});

export const resultTemplatePayloadSchema = z.object({
  commentLabelArabic: z.string().optional(),
  directorSignatureLabel: z.string().optional(),
  reports: z.array(
    z.object({
      classroomName: nullableText,
      commentArabic: nullableText,
      commentEnglish: nullableText,
      percentage: z.number(),
      position: z.number(),
      studentName: z.string().min(1),
      tables: z.array(resultTableSchema),
      totalStudents: z.number(),
    }),
  ),
  returnDate: nullableText,
  schoolAddress: nullableText,
  schoolName: z.string().min(1),
  teacherSignatureLabel: z.string().optional(),
  termLabel: nullableText,
}) satisfies z.ZodType<ResultTemplatePayload>;
