import { z } from "zod";

export const enrollmentApplicationStatusSchema = z.enum([
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
]);

export const enrollmentLinkStatusSchema = z.enum([
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
]);

export const enrollmentCapacityModeSchema = z.enum(["TOTAL", "PER_CLASSROOM"]);

export const enrollmentDocumentTypeSchema = z.enum([
  "GENERAL",
  "PASSPORT_PHOTO",
  "BIRTH_CERTIFICATE",
  "PREVIOUS_SCHOOL_REPORT",
  "OTHER",
]);

export const admissionLetterTemplateIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);

const enrollmentClassroomInputSchema = z.object({
  classRoomDepartmentId: z.string().min(1),
  capacity: z.number().int().positive().optional().nullable(),
  minimumAgeMonths: z.number().int().nonnegative().optional().nullable(),
  maximumAgeMonths: z.number().int().nonnegative().optional().nullable(),
  ageCutoffDate: z.date().optional().nullable(),
  requirementNotes: z.string().optional().nullable(),
});

const enrollmentDocumentRequirementInputSchema = z.object({
  id: z.string().optional().nullable(),
  label: z.string().min(1),
  description: z.string().optional().nullable(),
  documentType: enrollmentDocumentTypeSchema.default("GENERAL"),
  uploadRequired: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  classRoomDepartmentId: z.string().optional().nullable(),
});

export const createOrUpdateEnrollmentLinkSchema = z
  .object({
    id: z.string().optional().nullable(),
    title: z.string().min(1),
    status: enrollmentLinkStatusSchema.default("ACTIVE"),
    showOnWebsite: z.boolean().default(false),
    capacityMode: enrollmentCapacityModeSchema.default("TOTAL"),
    totalCapacity: z.number().int().positive().optional().nullable(),
    instructions: z.string().optional().nullable(),
    opensAt: z.date().optional().nullable(),
    closesAt: z.date().optional().nullable(),
    classrooms: z.array(enrollmentClassroomInputSchema).min(1),
    documentRequirements: z
      .array(enrollmentDocumentRequirementInputSchema)
      .default([]),
  })
  .superRefine((value, ctx) => {
    if (value.capacityMode === "TOTAL" && !value.totalCapacity) {
      ctx.addIssue({
        code: "custom",
        message: "Total capacity is required when using total capacity mode.",
        path: ["totalCapacity"],
      });
    }

    if (
      value.capacityMode === "PER_CLASSROOM" &&
      value.classrooms.some((classroom) => !classroom.capacity)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Each classroom needs a capacity in per-classroom mode.",
        path: ["classrooms"],
      });
    }

    value.classrooms.forEach((classroom, index) => {
      if (
        classroom.minimumAgeMonths != null &&
        classroom.maximumAgeMonths != null &&
        classroom.minimumAgeMonths > classroom.maximumAgeMonths
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Minimum age cannot be greater than maximum age.",
          path: ["classrooms", index, "minimumAgeMonths"],
        });
      }
    });

    const selectedClassroomIds = new Set(
      value.classrooms.map((classroom) => classroom.classRoomDepartmentId),
    );
    value.documentRequirements.forEach((requirement, index) => {
      if (
        requirement.classRoomDepartmentId &&
        !selectedClassroomIds.has(requirement.classRoomDepartmentId)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Requirement class target must be part of the link.",
          path: ["documentRequirements", index, "classRoomDepartmentId"],
        });
      }
    });
  });

export const setEnrollmentLinkStatusSchema = z.object({
  id: z.string(),
  status: enrollmentLinkStatusSchema,
});

export const getEnrollmentApplicationsSchema = z.object({
  linkId: z.string().optional().nullable(),
  status: enrollmentApplicationStatusSchema.optional().nullable(),
});

export const approveEnrollmentApplicationSchema = z
  .object({
    admissionLetterTemplateId: admissionLetterTemplateIdSchema
      .default("admission-classic-v1")
      .optional()
      .nullable(),
    applicationId: z.string(),
    paymentRequired: z.boolean().default(false),
    paymentLabel: z.string().optional().nullable(),
    paymentAmount: z.coerce.number().nonnegative().optional().nullable(),
    paymentCurrency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/)
      .transform((value) => value.toUpperCase())
      .default("NGN"),
    paymentInstructions: z.string().optional().nullable(),
    paymentLink: z.string().url().optional().nullable().or(z.literal("")),
    paymentDueAt: z.date().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.paymentRequired) return;

    const hasPaymentAmount = (value.paymentAmount ?? 0) > 0;
    const hasPaymentHandoff =
      Boolean(value.paymentInstructions?.trim()) || Boolean(value.paymentLink);

    if (!hasPaymentAmount) {
      ctx.addIssue({
        code: "custom",
        message: "A positive payment amount is required before approving with payment.",
        path: ["paymentAmount"],
      });
    }

    if (!hasPaymentHandoff) {
      ctx.addIssue({
        code: "custom",
        message:
          "Payment instructions or a payment link is required before approving with payment.",
        path: ["paymentInstructions"],
      });
    }
  });

export const rejectEnrollmentApplicationSchema = z.object({
  applicationId: z.string(),
  reason: z.string().optional().nullable(),
});

export type CreateOrUpdateEnrollmentLinkInput = z.infer<
  typeof createOrUpdateEnrollmentLinkSchema
>;
export type GetEnrollmentApplicationsInput = z.infer<
  typeof getEnrollmentApplicationsSchema
>;
export type ApproveEnrollmentApplicationInput = z.infer<
  typeof approveEnrollmentApplicationSchema
>;
