import { z } from "zod";

export const assistantMessagePartSchema = z.union([
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

export type AssistantMessagePart = z.infer<typeof assistantMessagePartSchema>;
export type WorkflowAction = z.infer<typeof workflowActionSchema>;
export type ChatInput = z.infer<typeof chatInputSchema>;

export type AssistantCapabilityConfig = {
  key: string;
  label: string;
  module: string;
  roles: string[];
  isMutation: boolean;
  toolNames: string[];
};

export const assistantCapabilities = [
  {
    key: "students.read",
    label: "Student lookup",
    module: "students",
    roles: ["Admin", "Registrar", "Teacher", "Accountant", "Staff"],
    isMutation: false,
    toolNames: ["searchStudents", "getStudentPaymentData", "getStudentAttendanceHistory"],
  },
  {
    key: "students.enrollment",
    label: "Enrollment actions",
    module: "students",
    roles: ["Admin", "Registrar"],
    isMutation: true,
    toolNames: ["listClassrooms", "enrollStudent"],
  },
  {
    key: "finance.read",
    label: "Finance lookup",
    module: "finance",
    roles: ["Admin", "Accountant"],
    isMutation: false,
    toolNames: ["getStudentPaymentData"],
  },
  {
    key: "finance.write",
    label: "Receive payments",
    module: "finance",
    roles: ["Admin", "Accountant"],
    isMutation: true,
    toolNames: ["receiveStudentPayment"],
  },
  {
    key: "inventory.read",
    label: "Inventory lookup",
    module: "inventory",
    roles: ["Admin", "Accountant", "Staff"],
    isMutation: false,
    toolNames: ["searchInventoryItems"],
  },
  {
    key: "inventory.write",
    label: "Inventory actions",
    module: "inventory",
    roles: ["Admin", "Accountant", "Staff"],
    isMutation: true,
    toolNames: ["createInventoryItem", "recordInventoryIssuance"],
  },
  {
    key: "staff.read",
    label: "Staff lookup",
    module: "staff",
    roles: ["Admin", "HR", "Teacher"],
    isMutation: false,
    toolNames: ["searchStaffMembers", "getTeacherWorkspaceSummary"],
  },
  {
    key: "attendance.read",
    label: "Attendance insights",
    module: "academics",
    roles: ["Admin", "Teacher", "Registrar"],
    isMutation: false,
    toolNames: ["getStudentAttendanceHistory"],
  },
  {
    key: "parents.read",
    label: "Guardian lookup",
    module: "parent-portal",
    roles: ["Admin", "Registrar", "Staff"],
    isMutation: false,
    toolNames: ["searchGuardians"],
  },
] as const satisfies readonly AssistantCapabilityConfig[];

export type AssistantCapabilityKey = (typeof assistantCapabilities)[number]["key"];

export const assistantCapabilityMap = Object.fromEntries(
  assistantCapabilities.map((cap) => [cap.key, cap]),
) as unknown as Record<AssistantCapabilityKey, AssistantCapabilityConfig>;

export const defaultAssistantSuggestions = [
  "Enroll a student into a classroom",
  "Receive a fee payment",
  "Record a book purchase or issuance",
  "Check a student's balance",
] as const;

export function detectAssistantLocale(text: string) {
  return /[\u0600-\u06FF]/.test(text) ? "ar" : "en";
}

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
