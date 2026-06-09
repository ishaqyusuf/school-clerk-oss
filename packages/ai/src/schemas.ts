import { z } from "zod";

export const aiMessagePartSchema = z.union([
  z.object({
    type: z.literal("text"),
    text: z.string(),
    state: z.enum(["streaming", "done"]).optional(),
  }),
  z.object({
    type: z.literal("tool-invocation"),
    toolName: z.string(),
    toolCallId: z.string(),
    state: z.enum(["input-available", "output-available"]),
    input: z.unknown(),
    output: z.unknown().optional(),
  }),
]);

export const workflowActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("select-student"),
    studentId: z.string(),
    studentName: z.string(),
    termFormId: z.string().nullable().optional(),
    classroom: z.string().nullable().optional(),
  }),
  z.object({
    type: z.literal("select-classroom"),
    classroomDepartmentId: z.string(),
    classroomName: z.string(),
  }),
  z.object({
    type: z.literal("confirm-payment"),
    studentId: z.string(),
    studentTermFormId: z.string(),
    studentName: z.string(),
    amount: z.number().positive(),
    allocations: z.array(
      z.object({
        studentFeeId: z.string(),
        feeTitle: z.string(),
        amountToPay: z.number().positive(),
      }),
    ),
    paymentMethod: z.string(),
  }),
  z.object({
    type: z.literal("confirm-tool"),
    toolName: z.string(),
    confirmationToken: z.string(),
    summary: z.string(),
    actionInput: z.record(z.string(), z.unknown()),
  }),
]);

export const chatInputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    text: z.string().min(1),
  }),
  z.object({
    kind: z.literal("workflow"),
    action: workflowActionSchema,
  }),
]);

export type AiMessagePart = z.infer<typeof aiMessagePartSchema>;
export type WorkflowAction = z.infer<typeof workflowActionSchema>;
export type ChatInput = z.infer<typeof chatInputSchema>;

export const assistantMessagePartSchema = aiMessagePartSchema;
export type AssistantMessagePart = AiMessagePart;

export function detectAiChatLocale(text: string) {
  return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
}

export const detectAssistantLocale = detectAiChatLocale;

export function summarizeConversationTitle(text: string) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length <= 48 ? clean : `${clean.slice(0, 45)}...`;
}

export function workflowActionToMessage(action: WorkflowAction) {
  switch (action.type) {
    case "select-student":
      return `Selected student: ${action.studentName} (id:${action.studentId}, termFormId:${action.termFormId ?? "none"}, classroom:${action.classroom ?? "unknown"}). Continue with the task using this exact student.`;
    case "select-classroom":
      return `Selected classroom: ${action.classroomName} (id:${action.classroomDepartmentId}). Continue with this exact classroom.`;
    case "confirm-payment":
      return `Confirmed payment for ${action.studentName}. studentId:${action.studentId} studentTermFormId:${action.studentTermFormId} amount:${action.amount} paymentMethod:${action.paymentMethod} allocations:${JSON.stringify(action.allocations)}. Execute the payment now.`;
    case "confirm-tool":
      return `Confirmation approved for tool ${action.toolName}. confirmationToken:${action.confirmationToken}. actionInput:${JSON.stringify(action.actionInput)}. Execute the confirmed action now.`;
  }
}

export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}
