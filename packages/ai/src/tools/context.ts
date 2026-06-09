import type { SchoolAssistantConfig } from "@school-clerk/db";
import type { aiCapabilityMap } from "../capabilities";

export type SchoolAiToolContext = {
	conversationId: string;
	schoolId: string;
	sessionId: string | null;
	termId: string | null;
	userId: string;
	role: string | null;
	userName: string;
	config: SchoolAssistantConfig;
	runId: string;
};

export type SchoolAiToolConfirmationPayload = {
	conversationId: string;
	schoolId: string;
	toolName: string;
	actionInput: Record<string, unknown>;
};

export type SchoolAiActivityType =
	| "assistant_run"
	| "assistant_action_requested"
	| "assistant_action_completed"
	| "assistant_action_blocked";

export type SchoolAiToolRuntimeDeps = {
	buildConfirmationToken(input: SchoolAiToolConfirmationPayload): string;
	createAssistantToolExecution(input: {
		runId: string;
		conversationId: string;
		schoolId: string;
		toolName: string;
		capability: keyof typeof aiCapabilityMap;
		isMutation: boolean;
		input: unknown;
	}): Promise<{ id: string }>;
	finishAssistantToolExecution(input: {
		toolExecutionId: string;
		status: "completed" | "blocked" | "failed";
		output?: unknown;
		error?: string;
	}): Promise<unknown>;
	getTeacherWorkspaceSummary(): Promise<unknown>;
	isCapabilityAllowed(input: {
		role: string | null;
		config: SchoolAssistantConfig;
		capability: keyof typeof aiCapabilityMap;
	}): boolean;
	readConfirmationToken(token: string): SchoolAiToolConfirmationPayload | null;
	recordAssistantActivity(input: {
		schoolId: string;
		userId: string;
		userName?: string | null;
		type: SchoolAiActivityType;
		title: string;
		description?: string | null;
		meta?: Record<string, unknown>;
	}): Promise<unknown>;
};

export function studentDisplayName(s: {
	name?: string | null;
	otherName?: string | null;
	surname?: string | null;
}) {
	return [s.name, s.otherName, s.surname].filter(Boolean).join(" ");
}

export function createSchoolAiToolHelpers(
	ctx: SchoolAiToolContext,
	deps: SchoolAiToolRuntimeDeps,
) {
	const guardCapability = async (
		capability: keyof typeof aiCapabilityMap,
		toolName: string,
		input: unknown,
		isMutation: boolean,
	) => {
		const execution = await deps.createAssistantToolExecution({
			runId: ctx.runId,
			conversationId: ctx.conversationId,
			schoolId: ctx.schoolId,
			toolName,
			capability,
			isMutation,
			input,
		});

		if (!deps.isCapabilityAllowed({ role: ctx.role, config: ctx.config, capability })) {
			const output = {
				blocked: true,
				toolName,
				message: "This action is not available for your current role or AI settings.",
			};
			await deps.finishAssistantToolExecution({
				toolExecutionId: execution.id,
				status: "blocked",
				output,
			});
			return { executionId: execution.id, blocked: output };
		}

		return { executionId: execution.id, blocked: null };
	};

	const requiresConfirmationResult = (params: {
		ctx?: unknown;
		toolName: string;
		summary: string;
		actionInput: Record<string, unknown>;
	}) => ({
		requiresConfirmation: true,
		toolName: params.toolName,
		summary: params.summary,
		confirmationToken: deps.buildConfirmationToken({
			conversationId: ctx.conversationId,
			schoolId: ctx.schoolId,
			toolName: params.toolName,
			actionInput: params.actionInput,
		}),
		actionInput: params.actionInput,
	});

	const isConfirmedMutation = (params: {
		ctx?: unknown;
		toolName: string;
		confirmationToken?: string;
		actionInput: Record<string, unknown>;
	}) => {
		if (!params.confirmationToken) return false;
		const decoded = deps.readConfirmationToken(params.confirmationToken);
		if (!decoded) return false;

		return (
			decoded.conversationId === ctx.conversationId &&
			decoded.schoolId === ctx.schoolId &&
			decoded.toolName === params.toolName &&
			JSON.stringify(decoded.actionInput) === JSON.stringify(params.actionInput)
		);
	};

	return {
		finishAssistantToolExecution: deps.finishAssistantToolExecution,
		getTeacherWorkspaceSummary: deps.getTeacherWorkspaceSummary,
		guardCapability,
		isConfirmedMutation,
		recordAssistantActivity: deps.recordAssistantActivity,
		requiresConfirmationResult,
	};
}

export type SchoolAiToolHelpers = ReturnType<typeof createSchoolAiToolHelpers>;
