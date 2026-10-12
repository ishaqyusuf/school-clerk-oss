import { z } from "zod";

export const contextRecordSchema = z
	.object({
		kind: z.enum(["student", "classroom", "payment", "inventory", "staff"]),
		id: z.string().min(1).max(191),
		label: z.string().min(1).max(160),
	})
	.strict();
export type AssistantContextRecord = z.infer<typeof contextRecordSchema>;
export const assistantRequestSchema = z
	.object({
		conversationId: z.string().min(1).max(191),
		requestId: z.string().uuid(),
		text: z.string().trim().min(1).max(12000),
		records: z.array(contextRecordSchema).max(50).default([]),
		attachmentIds: z.array(z.string().min(1).max(191)).max(5).default([]),
	})
	.strict();
export const assistantSettingsSchema = z
	.object({
		enabled: z.boolean(),
		preferredProvider: z.enum(["deepseek", "openai", "anthropic", "gemini"]),
		preferredModel: z.string().trim().min(1).max(120),
		maxSteps: z.number().int().min(1).max(10),
		dailyRequestLimit: z.number().int().min(1).max(10000),
		dailyTokenLimit: z.number().int().min(200000).max(10000000),
		concurrentRunLimit: z.number().int().min(1).max(5),
		disabledCapabilities: z.array(z.string().max(80)).max(30),
	})
	.strict();
export const assistantResultSchema = z.object({
	status: z.enum(["success", "requires_approval", "denied", "failed"]),
	toolId: z.string(),
	toolVersion: z.literal(1),
	data: z.unknown(),
	observedAt: z.string(),
	sources: z.array(z.object({ label: z.string(), href: z.string() })),
	invalidationTags: z.array(z.string()),
});
export function mergeAssistantRecords(
	current: AssistantContextRecord[],
	incoming: AssistantContextRecord[],
) {
	const records = new Map(
		current.map((record) => [`${record.kind}:${record.id}`, record]),
	);
	for (const record of incoming)
		records.set(`${record.kind}:${record.id}`, record);
	return [...records.values()].slice(0, 50);
}

export { assistantToolInfo, assistantToolCatalog } from "./catalog";
