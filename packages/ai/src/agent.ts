import type { AiCapabilityKey } from "./capabilities";
import type { ResolvedModuleAccess } from "@school-clerk/utils/module-config";
import { canUseSchoolAiTool, getSchoolAiToolPolicy, SchoolAiToolAccessError } from "./tools/module-policy";

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
  moduleAccess: ResolvedModuleAccess;
  assertToolAccess(input: { toolName: string; capability: AiCapabilityKey }): Promise<void>;
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
  return async (input: TInput) => {
    const policy = getSchoolAiToolPolicy(toolDefinition.name);
    if (policy?.capability !== toolDefinition.capability ||
      !canUseSchoolAiTool(toolDefinition.name, ctx.moduleAccess, ctx.allowedCapabilities)) {
      throw new SchoolAiToolAccessError();
    }
    await ctx.assertToolAccess({ toolName: toolDefinition.name, capability: toolDefinition.capability });
    return toolDefinition.execute(input, ctx);
  };
}
