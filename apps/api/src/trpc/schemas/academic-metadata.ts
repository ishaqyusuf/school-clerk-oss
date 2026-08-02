import { z } from "zod";

const dateRangeRefinement = (value: {
	startDate: Date | null;
	endDate?: Date | null;
}) =>
	!value.startDate ||
	!value.endDate ||
	value.endDate.getTime() >= value.startDate.getTime();

export const updateAcademicSessionMetadataSchema = z
	.object({
		sessionId: z.string().min(1),
		title: z.string().trim().min(1, "Academic session title is required"),
		startDate: z.date().nullable(),
		endDate: z.date().optional().nullable(),
	})
	.refine(dateRangeRefinement, {
		message: "End date must be on or after the start date",
		path: ["endDate"],
	});

export const updateAcademicTermMetadataSchema = z
	.object({
		termId: z.string().min(1),
		title: z.string().trim().min(1, "Term title is required").optional(),
		startDate: z.date().nullable(),
		endDate: z.date().optional().nullable(),
		note: z.string().trim().max(2_000).optional().nullable(),
	})
	.refine(dateRangeRefinement, {
		message: "End date must be on or after the start date.",
		path: ["endDate"],
	});

export type UpdateAcademicSessionMetadata = z.infer<
	typeof updateAcademicSessionMetadataSchema
>;
export type UpdateAcademicTermMetadata = z.infer<
	typeof updateAcademicTermMetadataSchema
>;
