import { completeAssistantMutation, type AssistantMutationTransaction, type AssistantConfirmationTransaction, type SchoolAssistantConfig, type Prisma } from "@school-clerk/db";
import type { SchoolAiConfirmationPayload, SchoolAiSignedConfirmationPayload } from "../workflows/confirmation-token";
import {
	type StudentNameFormat,
	type StudentNameParts,
	formatStudentName,
} from "@school-clerk/utils/student-name";
import type { aiCapabilityMap } from "../capabilities";
import type { ResolvedModuleAccess } from "@school-clerk/utils/module-config";
import { getSchoolAiToolPolicy, SchoolAiToolAccessError } from "./module-policy";

export type SchoolAiToolContext = {
	conversationId: string;
	schoolId: string;
	sessionId: string | null;
	termId: string | null;
	userId: string;
	role: string | null;
	userName: string;
	config: SchoolAssistantConfig;
	moduleAccess: ResolvedModuleAccess;
	runId: string;
	studentNameFormat?: StudentNameFormat;
};

export type SchoolAiToolConfirmationPayload = SchoolAiConfirmationPayload;

export type SchoolAiActivityType =
	| "assistant_run"
	| "assistant_action_requested"
	| "assistant_action_completed"
	| "assistant_action_blocked";

export type SchoolAiToolRuntimeDeps = {
	assertToolAccess(input: { toolName: string; capability: keyof typeof aiCapabilityMap }): Promise<void>;
	isUserConfirmed(input: {
		toolName: string;
		confirmationToken: string;
		actionInput: Record<string, unknown>;
	}): boolean;
	buildConfirmationToken(input: SchoolAiToolConfirmationPayload & { runId: string }): Promise<string>;
	consumeConfirmation(tx: AssistantConfirmationTransaction, input: {
		token: string;
		payload: SchoolAiSignedConfirmationPayload;
		runId: string;
	}): Promise<void>;
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
		moduleAccess: ResolvedModuleAccess;
	}): boolean;
	readConfirmationToken(token: string): SchoolAiSignedConfirmationPayload | null;
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

export function studentDisplayName(
	student: StudentNameParts,
	format?: StudentNameFormat,
) {
	return formatStudentName(student, format);
}

export function createSchoolAiToolHelpers(
	ctx: SchoolAiToolContext,
	deps: SchoolAiToolRuntimeDeps,
) {
	const approvedTokens = new Set<string>();
	const assertCurrentAccess = async (toolName: string) => {
		const policy = getSchoolAiToolPolicy(toolName);
		if (!policy) throw new SchoolAiToolAccessError("This tool has no declared access policy.");
		await deps.assertToolAccess({ toolName, capability: policy.capability });
	};
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

		try {
			const policy = getSchoolAiToolPolicy(toolName);
			if (!policy || policy.capability !== capability) throw new SchoolAiToolAccessError();
			await assertCurrentAccess(toolName);
		} catch (error) {
			const output = { blocked: true, toolName, message: error instanceof SchoolAiToolAccessError
				? error.message : "Tool authorization could not be verified. Try again later." };
			await deps.finishAssistantToolExecution({
				toolExecutionId: execution.id,
				status: error instanceof SchoolAiToolAccessError ? "blocked" : "failed",
				output,
			});
			return { executionId: execution.id, blocked: output };
		}

		if (
			!deps.isCapabilityAllowed({
				role: ctx.role,
				config: ctx.config,
				capability,
				moduleAccess: ctx.moduleAccess,
			})
		) {
			const output = {
				blocked: true,
				toolName,
				message:
					"This action is not available for your current role or AI settings.",
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

	const requiresConfirmationResult = async (params: {
		ctx?: unknown;
		toolName: string;
		summary: string;
		actionInput: Record<string, unknown>;
	}) => ({
		requiresConfirmation: true,
		toolName: params.toolName,
		summary: params.summary,
		confirmationToken: await deps.buildConfirmationToken({
			conversationId: ctx.conversationId,
			schoolId: ctx.schoolId,
			toolName: params.toolName,
			userId: ctx.userId,
			sessionId: ctx.sessionId,
			termId: ctx.termId,
			runId: ctx.runId,
			actionInput: params.actionInput,
		}),
		actionInput: params.actionInput,
	});

	const isConfirmedMutation = async (params: {
		ctx?: unknown;
		toolName: string;
		confirmationToken?: string;
		actionInput: Record<string, unknown>;
	}) => {
		if (!params.confirmationToken) return false;
		// A token echoed by the model is not evidence of a user confirmation.
		if (!deps.isUserConfirmed({
			toolName: params.toolName,
			confirmationToken: params.confirmationToken,
			actionInput: params.actionInput,
		})) return false;
		const decoded = deps.readConfirmationToken(params.confirmationToken);
		if (!decoded) return false;
		await assertCurrentAccess(params.toolName);

		const matches = (
			decoded.conversationId === ctx.conversationId &&
			decoded.schoolId === ctx.schoolId &&
			decoded.userId === ctx.userId &&
			decoded.sessionId === ctx.sessionId &&
			decoded.termId === ctx.termId &&
			decoded.toolName === params.toolName &&
			JSON.stringify(decoded.actionInput) === JSON.stringify(params.actionInput)
		);
		if (matches) approvedTokens.add(params.confirmationToken);
		return matches;
	};

	const consumeMutationConfirmation = async (tx: AssistantConfirmationTransaction, params: {
		toolName: string;
		confirmationToken?: string;
		actionInput: Record<string, unknown>;
	}) => {
		if (!params.confirmationToken || !approvedTokens.has(params.confirmationToken)) {
			throw new SchoolAiToolAccessError("An explicit approval is required for this action.");
		}
		const payload = deps.readConfirmationToken(params.confirmationToken);
		if (!payload || payload.toolName !== params.toolName ||
			JSON.stringify(payload.actionInput) !== JSON.stringify(params.actionInput)) {
			throw new SchoolAiToolAccessError("The approval expired or the action changed. Review it again.");
		}
		await deps.consumeConfirmation(tx, { token: params.confirmationToken, payload, runId: ctx.runId });
	};

	const completeMutation = async <T extends Prisma.InputJsonObject>(tx: AssistantMutationTransaction, params: {
		executionId: string; toolName: string; output: T; title: string; description: string;
	}) => {
		const receipt = await completeAssistantMutation(tx, {
			...params, runId: ctx.runId, conversationId: ctx.conversationId,
			schoolId: ctx.schoolId, userId: ctx.userId, userName: ctx.userName,
		});
		return { ...params.output, receipt };
	};

	return {
		completeMutation,
		consumeMutationConfirmation,
		finishAssistantToolExecution: deps.finishAssistantToolExecution,
		getTeacherWorkspaceSummary: deps.getTeacherWorkspaceSummary,
		guardCapability,
		isConfirmedMutation,
		recordAssistantActivity: deps.recordAssistantActivity,
		requiresConfirmationResult,
	};
}

export type SchoolAiToolHelpers = ReturnType<typeof createSchoolAiToolHelpers>;
