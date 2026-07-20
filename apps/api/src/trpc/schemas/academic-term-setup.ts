import { z } from "zod";

export const termCopyOptionSchema = z.enum(["copy-all", "select", "empty"]);

export const academicTermSetupSelectionSchema = z.object({
	termId: z.string().min(1),
	previousTermId: z.string().min(1).optional().nullable(),
	classroomOption: termCopyOptionSchema,
	subjectOption: termCopyOptionSchema,
	studentOption: termCopyOptionSchema,
	teacherOption: termCopyOptionSchema,
	selectedClassroomIds: z.array(z.string()).default([]),
	selectedSubjectIds: z.array(z.string()).default([]),
	selectedStudentIds: z.array(z.string()).default([]),
	selectedTeacherIds: z.array(z.string()).default([]),
});

export const academicTermSetupApplySchema =
	academicTermSetupSelectionSchema.extend({
		idempotencyKey: z.string().min(8).max(200),
	});

export const createAcademicTermDraftSchema = z
	.object({
		sessionId: z.string().min(1),
		title: z.string().trim().min(1, "Term title is required"),
		startDate: z.date().optional().nullable(),
		endDate: z.date().optional().nullable(),
		note: z.string().trim().max(2_000).optional().nullable(),
	})
	.refine(
		(value) =>
			!value.startDate ||
			!value.endDate ||
			value.endDate.getTime() >= value.startDate.getTime(),
		{
			message: "End date must be on or after the start date.",
			path: ["endDate"],
		},
	);

export const saveAcademicTermDraftSchema = z
	.object({
		termId: z.string().min(1),
		startDate: z.date(),
		endDate: z.date().optional().nullable(),
		note: z.string().trim().max(2_000).optional().nullable(),
	})
	.refine(
		(value) =>
			!value.endDate || value.endDate.getTime() >= value.startDate.getTime(),
		{
			message: "End date must be on or after the start date.",
			path: ["endDate"],
		},
	);

export const academicTermIdSchema = z.object({
	termId: z.string().min(1),
});

export type AcademicTermSetupSelection = z.infer<
	typeof academicTermSetupSelectionSchema
>;
export type AcademicTermSetupApply = z.infer<
	typeof academicTermSetupApplySchema
>;
export type CreateAcademicTermDraft = z.infer<
	typeof createAcademicTermDraftSchema
>;
export type SaveAcademicTermDraft = z.infer<typeof saveAcademicTermDraftSchema>;
