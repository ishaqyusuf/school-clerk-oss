export * from "./confirmation-token";

export const schoolAiWorkflowStages = [
  "search",
  "disambiguate",
  "confirm",
  "execute",
  "receipt",
] as const;

export type SchoolAiWorkflowStage = (typeof schoolAiWorkflowStages)[number];
