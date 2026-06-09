import { createSchoolAiToolHelpers, type SchoolAiToolContext, type SchoolAiToolRuntimeDeps } from "./context";
import { createAssessmentTools } from "./assessments";
import { createAttendanceTools } from "./attendance";
import { createFinanceTools } from "./finance";
import { createGuardianTools } from "./guardians";
import { createInventoryTools } from "./inventory";
import { createStaffTools } from "./staff";
import { createStudentTools } from "./students";

export function createSchoolAiTools(
	ctx: SchoolAiToolContext,
	deps: SchoolAiToolRuntimeDeps,
) {
	const helpers = createSchoolAiToolHelpers(ctx, deps);

	return {
		...createStudentTools(ctx, helpers),
		...createFinanceTools(ctx, helpers),
		...createInventoryTools(ctx, helpers),
		...createStaffTools(ctx, helpers),
		...createAttendanceTools(ctx, helpers),
		...createAssessmentTools(ctx, helpers),
		...createGuardianTools(ctx, helpers),
	};
}

export * from "./assessments";
export * from "./attendance";
export * from "./context";
export * from "./finance";
export * from "./guardians";
export * from "./inventory";
export * from "./staff";
export * from "./students";
