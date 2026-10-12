import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";
import {
	prisma,
	getModuleAccessActor,
	getSchoolModuleConfiguration,
} from "@school-clerk/db";
import { readConversation } from "@school-clerk/db/assistant";
import {
	getAllowedCapabilities,
	getSchoolAiAvailableToolNames,
} from "@school-clerk/ai";
import {
	resolveModuleAccess,
	canAccessModules,
} from "@school-clerk/utils/module-config";
import { AssistantReport } from "@school-clerk/pdf/assistant-report";
import { renderToBuffer } from "@school-clerk/pdf";
import { createElement } from "react";
function reportText(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (Array.isArray(value)) return value.map(reportText).join("\n");
	if (typeof value === "object")
		return Object.entries(value)
			.filter(([key]) => !["confirmationToken", "token"].includes(key))
			.map(([key, v]) => `${key}: ${reportText(v)}`)
			.join("\n");
	return String(value);
}
export async function exportAssistantConversation(artifactId: string) {
	const artifact = await prisma.assistantArtifact.findUniqueOrThrow({
		where: { id: artifactId },
	});
	if (artifact.status === "ready") return { id: artifact.id };
	const claimed = await prisma.assistantArtifact.updateMany({
		where: { id: artifactId, status: { in: ["queued", "failed", "running"] } },
		data: { status: "running", error: null },
	});
	if (!claimed.count) return { id: artifact.id };
	try {
		if (!artifact.authSessionId) throw new Error("Session unavailable");
		const actor = await getModuleAccessActor(
			prisma,
			artifact.userId,
			artifact.authSessionId,
		);
		if (!actor?.saasAccountId || actor.role !== "Admin")
			throw new Error("Access unavailable");
		const school = await getSchoolModuleConfiguration(prisma, {
			schoolId: artifact.schoolProfileId,
			accountId: actor.saasAccountId,
		});
		const access = resolveModuleAccess(school?.moduleConfiguration);
		if (!school || !canAccessModules(access, ["AI_ASSISTANT"]))
			throw new Error("Access unavailable");
		const config = await prisma.schoolAssistantConfig.findFirstOrThrow({
			where: { schoolProfileId: school.id, enabled: true, deletedAt: null },
		});
		const capabilities = getAllowedCapabilities({
			role: actor.role,
			moduleAccess: access,
			config,
		});
		const conversation = await readConversation(
			prisma,
			{
				schoolId: school.id,
				userId: actor.id,
				availableTools: getSchoolAiAvailableToolNames(access, capabilities),
			},
			artifact.conversationId,
		);
		if (!conversation) throw new Error("History unavailable");
		const entries = conversation.messages
			.map((message) => ({
				role: message.role,
				text: [
					message.content ?? "",
					...(Array.isArray(message.parts)
						? message.parts.flatMap((part) =>
								part && typeof part === "object" && "output" in part
									? [reportText(part.output)]
									: [],
							)
						: []),
				]
					.filter(Boolean)
					.join("\n"),
			}))
			.filter((entry) => entry.text)
			.slice(-100);
		const bytes = await renderToBuffer(
			createElement(AssistantReport, {
				title: conversation.title ?? "School Assistant",
				entries,
			}),
		);
		await prisma.assistantArtifact.update({
			where: { id: artifact.id },
			data: {
				status: "ready",
				bytes: new Uint8Array(bytes),
				content: { entries },
				authSessionId: null,
			},
		});
		return { id: artifact.id };
	} catch (error) {
		await prisma.assistantArtifact.update({
			where: { id: artifact.id },
			data: {
				status: "failed",
				error: "Export could not complete. Check access and retry.",
			},
		});
		throw error;
	}
}
export const assistantExportTask = schemaTask({
	id: "assistant-export-conversation",
	schema: z.object({ artifactId: z.string() }),
	retry: { maxAttempts: 2 },
	run: ({ artifactId }) => exportAssistantConversation(artifactId),
});
