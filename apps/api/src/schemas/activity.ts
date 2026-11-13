import { z } from "@hono/zod-openapi";
import { ACTIVITY_TYPES } from "@school-clerk/utils/activity";

export const activityTypeSchema = z.enum(ACTIVITY_TYPES);

export const activitySubjectSchema = z.object({
	type: z.enum([
		"student",
		"classroom",
		"attendance",
		"payment",
		"term",
		"import",
		"assessment",
	]),
	id: z.string().min(1).max(100),
});

export const activityRangeSchema = z.object({
	from: z.coerce.date().nullish(),
	to: z.coerce.date().nullish(),
});

export const activityFiltersSchema = activityRangeSchema.extend({
	types: z.array(activityTypeSchema).max(ACTIVITY_TYPES.length).nullish(),
	/** Member filter; ignored for viewers who can only see their own activity. */
	userIds: z.array(z.string().min(1).max(100)).max(50).nullish(),
	q: z.string().trim().max(120).nullish(),
	subject: activitySubjectSchema.nullish(),
});

/** Infinite-query compatible: `cursor` is the previous page's `nextCursor`. */
export const activityListSchema = activityFiltersSchema.extend({
	cursor: z.string().max(200).nullish(),
	limit: z.number().int().min(1).max(100).default(30),
});

export const activityByIdSchema = z.object({
	id: z.string().min(1).max(100),
	relatedLimit: z.number().int().min(1).max(50).default(10),
});

export const activityRuleUpdateSchema = z.object({
	type: activityTypeSchema,
	enabled: z.boolean(),
	inApp: z.boolean(),
	email: z.boolean(),
	/** Lower-case staff role names, e.g. "admin", "accountant". */
	roles: z.array(z.string().trim().min(1).max(40)).max(20),
	userIds: z.array(z.string().min(1).max(100)).max(100),
});
