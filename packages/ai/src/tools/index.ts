import { createSchoolAiToolHelpers, type SchoolAiToolContext, type SchoolAiToolRuntimeDeps } from "./context";
import { createAssessmentTools } from "./assessments";
import { createAttendanceTools } from "./attendance";
import { createFinanceTools } from "./finance";
import { createGuardianTools } from "./guardians";
import { createInventoryTools } from "./inventory";
import { createStaffTools } from "./staff";
import { createStudentTools } from "./students";
import { canUseSchoolAiTool } from "./module-policy";
import type { ToolSet } from "ai";
import { aiCapabilities } from "../capabilities";

export function createSchoolAiTools(
	ctx: SchoolAiToolContext,
	deps: SchoolAiToolRuntimeDeps,
) {
	const helpers = createSchoolAiToolHelpers(ctx, deps);

	const tools = {
		...createStudentTools(ctx, helpers),
		...createFinanceTools(ctx, helpers),
		...createInventoryTools(ctx, helpers),
		...createStaffTools(ctx, helpers),
		...createAttendanceTools(ctx, helpers),
		...createAssessmentTools(ctx, helpers),
		...createGuardianTools(ctx, helpers),
	};
	const allowedCapabilities = aiCapabilities.filter(({ key }) => deps.isCapabilityAllowed({
		role: ctx.role, config: ctx.config, capability: key, moduleAccess: ctx.moduleAccess,
	})).map(({ key }) => key);
	const availableTools: ToolSet = {};
	for (const [name, definition] of Object.entries(tools)) {
		if (canUseSchoolAiTool(name, ctx.moduleAccess, allowedCapabilities)) availableTools[name] = definition;
	}
	return availableTools;
}

export * from "./assessments";
export * from "./attendance";
export * from "./context";
export * from "./finance";
export * from "./guardians";
export * from "./inventory";
export * from "./staff";
export * from "./students";
export * from "./module-policy";
