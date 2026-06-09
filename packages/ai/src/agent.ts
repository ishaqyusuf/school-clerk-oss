import type { AiCapabilityKey } from "./capabilities";

export type SchoolAiRuntimeContext = {
  conversationId: string;
  schoolId: string;
  sessionId: string | null;
  termId: string | null;
  userId: string;
  role: string | null;
  userName: string;
  runId: string;
  allowedCapabilities: AiCapabilityKey[];
};

export type SchoolAiToolDefinition<TInput, TOutput> = {
  name: string;
  capability: AiCapabilityKey;
  isMutation: boolean;
  execute: (input: TInput, ctx: SchoolAiRuntimeContext) => Promise<TOutput>;
};

export function createSchoolAiToolExecutor<TInput, TOutput>(
  toolDefinition: SchoolAiToolDefinition<TInput, TOutput>,
  ctx: SchoolAiRuntimeContext,
) {
  return (input: TInput) => toolDefinition.execute(input, ctx);
}
