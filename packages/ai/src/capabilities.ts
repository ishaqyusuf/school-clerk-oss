export type AssistantCapabilityConfig = {
  key: string;
  label: string;
  module: string;
  roles: string[];
  isMutation: boolean;
  toolNames: string[];
};

export const aiCapabilities = [
  {
    key: "students.read",
    label: "Student lookup",
    module: "students",
    roles: ["Admin", "Registrar", "Teacher", "Accountant", "Staff"],
    isMutation: false,
    toolNames: [
      "searchStudents",
      "getStudentPaymentData",
      "getStudentAttendanceHistory",
    ],
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
    key: "assessments.write",
    label: "Assessment score entry",
    module: "academics",
    roles: ["Admin", "Teacher", "Registrar"],
    isMutation: true,
    toolNames: ["recordAssessmentScores"],
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

export type AiCapabilityKey = (typeof aiCapabilities)[number]["key"];

export const aiCapabilityMap = Object.fromEntries(
  aiCapabilities.map((capability) => [capability.key, capability]),
) as unknown as Record<AiCapabilityKey, AssistantCapabilityConfig>;

export const defaultAiChatSuggestions = [
  "Enroll a student into a classroom",
  "Record assessment scores",
  "Receive a fee payment",
  "Record a book purchase or issuance",
  "Check a student's balance",
] as const;

export const assistantCapabilities = aiCapabilities;
export const assistantCapabilityMap = aiCapabilityMap;
export type AssistantCapabilityKey = AiCapabilityKey;
export const defaultAssistantSuggestions = defaultAiChatSuggestions;
