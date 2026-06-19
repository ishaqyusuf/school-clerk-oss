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

const enrollmentClassroomInputSchema = z.object({
  classRoomDepartmentId: z.string().min(1),
  capacity: z.number().int().positive().optional().nullable(),
});

const enrollmentDocumentRequirementInputSchema = z.object({
  id: z.string().optional().nullable(),
  label: z.string().min(1),
  description: z.string().optional().nullable(),
  uploadRequired: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const createOrUpdateEnrollmentLinkSchema = z
  .object({
    id: z.string().optional().nullable(),
    title: z.string().min(1),
    status: enrollmentLinkStatusSchema.default("ACTIVE"),
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
  });

export const setEnrollmentLinkStatusSchema = z.object({
  id: z.string(),
  status: enrollmentLinkStatusSchema,
});

export const getEnrollmentApplicationsSchema = z.object({
  linkId: z.string().optional().nullable(),
  status: enrollmentApplicationStatusSchema.optional().nullable(),
});

export const approveEnrollmentApplicationSchema = z.object({
  applicationId: z.string(),
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
