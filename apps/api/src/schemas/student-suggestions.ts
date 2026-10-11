import { z } from "zod";

const namePart = z.string().trim().max(200).default("");

export const studentSuggestionsSchema = z
	.object({
		name: namePart,
		surname: namePart,
		otherName: namePart,
		cursor: z
			.string()
			.regex(/^[0-2]:\d{1,7}$/)
			.nullish(),
		pageSize: z.number().int().min(1).max(25).default(5),
		viewScope: z
			.object({
				schoolId: z.string().min(1).max(200),
				userId: z.string().min(1).max(200),
				loginSessionId: z.string().min(1).max(200),
				sessionId: z.string().min(1).max(200),
				termId: z.string().min(1).max(200),
			})
			.optional(),
	})
	.refine(
		(input) =>
			[input.name, input.surname, input.otherName].some(
				(part) => part.length >= 2,
			),
		{
			message: "Enter at least two characters in a name field.",
		},
	);

export type StudentSuggestionsInput = z.infer<typeof studentSuggestionsSchema>;
