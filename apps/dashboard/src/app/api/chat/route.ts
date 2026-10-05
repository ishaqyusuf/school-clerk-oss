import { getTeacherWorkspaceAction } from "@/actions/get-teacher-workspace";
import {
	assistantMessagesToUiMessages,
	assertAssistantToolAccess,
	buildConfirmationToken,
	completeAssistantRun,
	consumeConfirmation,
	createAssistantRun,
	createAssistantToolExecution,
	ensureAssistantConfig,
	finishAssistantToolExecution,
	getAllowedCapabilities,
	getAssistantConversation,
	getAssistantSessionContext,
	inputToUserMessage,
	isCapabilityAllowed,
	parseIncomingChatInput,
	readConfirmationToken,
	recordAssistantActivity,
	saveAssistantMessage,
} from "@/lib/assistant/server";
import { getDashboardStudentNameFormat } from "@/lib/student-name-format/server";
import {
	type SchoolAiToolContext,
	buildSchoolAiSystemPrompt,
	createSchoolAiTools,
	getAiModelSelection,
	getSchoolAiAvailableToolNames,
	type AiMessagePart,
} from "@school-clerk/ai";
import { consumeStream, convertToModelMessages, streamText } from "ai";
import { after, NextResponse } from "next/server";

export async function POST(req: Request) {
	const context = await getAssistantSessionContext();
	if (context instanceof Response) return context;
	if (!context?.schoolId || !context.userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const [config, studentNameFormat] = await Promise.all([
		ensureAssistantConfig(context.schoolId),
		getDashboardStudentNameFormat(context.schoolId),
	]);
	const allowedCapabilities = getAllowedCapabilities({
		role: context.role,
		config,
		moduleAccess: context.moduleAccess,
	});
	const availableTools = getSchoolAiAvailableToolNames(context.moduleAccess, allowedCapabilities);

	if (!config.enabled) {
		return NextResponse.json(
			{ error: "AI chat is disabled for this school." },
			{ status: 403 },
		);
	}

	if (!allowedCapabilities.length) {
		return NextResponse.json(
			{ error: "AI chat access is not available for your current role." },
			{ status: 403 },
		);
	}

	const body = (await req.json()) as {
		conversationId?: string;
		input?: unknown;
	};

	if (!body.conversationId || !body.input) {
		return NextResponse.json(
			{ error: "conversationId and input are required." },
			{ status: 400 },
		);
	}

	const conversation = await getAssistantConversation({
		conversationId: body.conversationId,
		schoolId: context.schoolId,
		userId: context.userId,
		availableTools,
		mode: "extend",
	});

	if (!conversation) {
		return NextResponse.json(
			{ error: "Conversation not found." },
			{ status: 404 },
		);
	}

	const parsedInput = parseIncomingChatInput(body.input);
	const userMessage = inputToUserMessage(parsedInput);

	const savedUserMessage = await saveAssistantMessage({
		conversationId: conversation.id,
		schoolId: context.schoolId,
		userId: context.userId,
		availableTools,
		role: "user",
		content: userMessage.content,
		parts: [{ type: "text", text: userMessage.content, state: "done" }],
		workflowState: parsedInput.kind === "workflow" ? parsedInput.action : null,
	});

	const { provider, modelName, model } = getAiModelSelection({
		preferredProvider: config.preferredProvider,
		preferredModel: config.preferredModel,
		fallbackProvider: process.env.AI_PROVIDER,
	});

	const run = await createAssistantRun({
		conversationId: conversation.id,
		schoolId: context.schoolId,
		userId: context.userId,
		provider,
		model: modelName,
		requestType: parsedInput.kind,
		promptSummary: userMessage.content.slice(0, 240),
		locale: userMessage.locale,
		workflowAction: parsedInput.kind === "workflow" ? parsedInput.action : null,
	});

	await recordAssistantActivity({
		schoolId: context.schoolId,
		userId: context.userId,
		userName: context.userName,
		type: "assistant_run",
		title: "AI run started",
		description: userMessage.content.slice(0, 160),
		meta: {
			conversationId: conversation.id,
			runId: run.id,
			requestType: parsedInput.kind,
			role: context.role,
		},
	});

	const routeContext: SchoolAiToolContext = {
		conversationId: conversation.id,
		schoolId: context.schoolId,
		sessionId: context.sessionId,
		termId: context.termId,
		userId: context.userId,
		role: context.role,
		userName: context.userName,
		config,
		runId: run.id,
		moduleAccess: context.moduleAccess,
		studentNameFormat,
	};

	let confirmationUsed = false;
	const tools = createSchoolAiTools(routeContext, {
		assertToolAccess: (input) => assertAssistantToolAccess(routeContext, input),
		isUserConfirmed: (input) => {
			const approved = !confirmationUsed && parsedInput.kind === "workflow" &&
			parsedInput.action.type === "confirm-tool" &&
			parsedInput.action.toolName === input.toolName &&
			parsedInput.action.confirmationToken === input.confirmationToken &&
			JSON.stringify(parsedInput.action.actionInput) === JSON.stringify(input.actionInput);
			if (approved) confirmationUsed = true;
			return approved;
		},
		buildConfirmationToken,
		consumeConfirmation,
		createAssistantToolExecution,
		finishAssistantToolExecution,
		getTeacherWorkspaceSummary: getTeacherWorkspaceAction,
		isCapabilityAllowed,
		readConfirmationToken,
		recordAssistantActivity,
	});
	const historyMessages = assistantMessagesToUiMessages([
		...conversation.messages,
		savedUserMessage,
	]);
	const modelMessages = await convertToModelMessages(
		historyMessages as Parameters<typeof convertToModelMessages>[0],
		{ tools },
	);

	const result = streamText({
		model,
		system: buildSchoolAiSystemPrompt({
			role: context.role,
			allowedCapabilities,
			extra: config.systemPromptExtra,
		}),
		messages: modelMessages,
		tools,
		onFinish: async ({ usage, finishReason, response, text, steps }) => {
			const parts: AiMessagePart[] = steps.flatMap((step) => [
				...(step.text ? [{ type: "text" as const, text: step.text, state: "done" as const }] : []),
				...step.toolResults.map((result) => ({
					type: "tool-invocation" as const, toolName: result.toolName, toolCallId: result.toolCallId,
					state: "output-available" as const, input: result.input, output: result.output,
				})),
			]);
			if (parts.length) await saveAssistantMessage({
				conversationId: conversation.id, schoolId: context.schoolId, userId: context.userId,
				availableTools, role: "assistant", content: steps.map((step) => step.text).filter(Boolean).join("\n"), parts,
			});
			await completeAssistantRun({
				runId: run.id,
				status: finishReason === "error" ? "failed" : "completed",
				usage: usage
					? {
							inputTokens: usage.inputTokens,
							outputTokens: usage.outputTokens,
							totalTokens: usage.totalTokens,
						}
					: null,
				metrics: {
					finishReason,
					responseMessages: response?.messages?.length ?? 0,
					assistantTextLength: text?.length ?? 0,
				},
			});
		},
		onError: async ({ error }) => {
			await completeAssistantRun({
				runId: run.id,
				status: "failed",
				error: error instanceof Error ? error.message : "AI run failed",
			});
		},
	});

	const response = result.toUIMessageStreamResponse({
		consumeSseStream: ({ stream }) => { after(consumeStream({ stream })); },
	});
	response.headers.set("x-school-clerk-conversation-id", conversation.id);
	response.headers.set("x-school-clerk-run-id", run.id);
	response.headers.set("x-school-clerk-provider", provider);
	response.headers.set("x-school-clerk-model", modelName);
	return response;
}
