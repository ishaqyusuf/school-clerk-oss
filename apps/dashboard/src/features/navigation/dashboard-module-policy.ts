import type { NavItemDefinition, NavModuleDefinition } from "@school-clerk/navigation";
import type { ModuleId } from "@school-clerk/utils/module-config";

const MODULE_REQUIREMENTS: Record<string, readonly ModuleId[]> = {
	overview: [],
	people: [],
	academics: [],
	finance: ["BILLING_FINANCE"],
	operations: ["INVENTORY_ASSETS"],
	"teacher-workspace": ["STAFF_MANAGEMENT"],
	"parent-portal": ["PARENT_PORTAL"],
	settings: [],
};

// Use registry keys, not URL prefixes: student enrollment and the directory
// share a URL branch but belong to independently controlled capabilities.
const ITEM_REQUIREMENTS: Record<string, readonly ModuleId[]> = {
	"dashboard-home": [],
	"students-list": ["STUDENT_MANAGEMENT"],
	"students-enrollment": ["ADMISSION_ENROLLMENT"],
	"staff-teachers": ["STAFF_MANAGEMENT"],
	"staff-non-teaching": ["STAFF_MANAGEMENT"],
	"staff-departments": ["STAFF_MANAGEMENT"],
	"staff-attendance": ["STAFF_MANAGEMENT"],
	"staff-payroll": ["STAFF_MANAGEMENT", "BILLING_FINANCE"],
	"academic-dashboard": ["ACADEMIC_PROGRAMS"],
	"academic-classes": ["ACADEMIC_PROGRAMS"],
	"academic-subjects": ["COURSES_SUBJECTS"],
	"academic-assessment-recording": ["ASSESSMENT_AND_EXAMS"],
	"academic-reports": ["RESULTS_AND_REPORTS"],
	"academic-student-report": ["RESULTS_AND_REPORTS"],
	"academic-assessments": ["ASSESSMENT_AND_EXAMS"],
	"academic-grading": ["ASSESSMENT_AND_EXAMS"],
	"finance-overview": ["BILLING_FINANCE"],
	"finance-receive-payment": ["BILLING_FINANCE", "STUDENT_MANAGEMENT"],
	"finance-student-balances": ["BILLING_FINANCE", "STUDENT_MANAGEMENT"],
	"finance-collections": ["BILLING_FINANCE", "STUDENT_MANAGEMENT"],
	"finance-payables": ["BILLING_FINANCE"],
	"finance-payroll-bills": ["BILLING_FINANCE"],
	"finance-service-bills": ["BILLING_FINANCE"],
	"finance-owing-repayments": ["BILLING_FINANCE"],
	"finance-streams": ["BILLING_FINANCE"],
	"finance-transfers": ["BILLING_FINANCE"],
	"finance-ledger": ["BILLING_FINANCE"],
	"finance-reconciliation": ["BILLING_FINANCE"],
	"finance-fee-structures": ["BILLING_FINANCE", "STUDENT_MANAGEMENT"],
	"finance-service-billables": ["BILLING_FINANCE"],
	"operations-inventory": ["INVENTORY_ASSETS"],
	"teacher-overview": ["ACADEMIC_PROGRAMS"],
	"teacher-classes": ["ACADEMIC_PROGRAMS"],
	"teacher-students": ["STUDENT_MANAGEMENT"],
	"teacher-attendance": ["ATTENDANCE"],
	"teacher-score-entry": ["ASSESSMENT_AND_EXAMS"],
	"teacher-reports": ["RESULTS_AND_REPORTS"],
	"teacher-assessments": ["ASSESSMENT_AND_EXAMS"],
	"teacher-grading": ["ASSESSMENT_AND_EXAMS"],
	"teacher-timetable": ["TIMETABLE"],
	"teacher-announcements": ["COMMUNICATION"],
	"teacher-calendar": ["ACADEMIC_PROGRAMS"],
	"parent-overview": ["PARENT_PORTAL"],
	"parent-performance": ["RESULTS_AND_REPORTS"],
	"parent-payments": ["BILLING_FINANCE"],
	"parent-messages": ["COMMUNICATION"],
	"settings-school-profile": [],
	"settings-sessions": ["ACADEMIC_PROGRAMS"],
	"settings-roles": [],
	"settings-document-templates": [],
	"settings-website": [],
	"settings-website-media": [],
};

function applyItemPolicy(item: NavItemDefinition): NavItemDefinition | null {
	const required = ITEM_REQUIREMENTS[item.key];
	// New links must declare a policy before appearing in configured tenants.
	if (!required) return null;
	return {
		...item,
		requiresModules: [...(item.requiresModules ?? []), ...required],
		children: item.children?.map(applyItemPolicy)
			.filter((child): child is NavItemDefinition => child !== null),
	};
}

export function applyDashboardModulePolicy(
	registry: readonly NavModuleDefinition[],
): NavModuleDefinition[] {
	return registry.flatMap((module) => {
		const required = MODULE_REQUIREMENTS[module.key];
		if (!required) return [];
		return [{
			...module,
			requiresModules: [...(module.requiresModules ?? []), ...required],
			sections: module.sections.map((section) => ({
				...section,
				items: section.items.map(applyItemPolicy)
					.filter((item): item is NavItemDefinition => item !== null),
			})),
		}];
	});
}

export function getNavigationModuleFlags(effectiveModules: readonly ModuleId[]): string[] {
	// Keep the existing Inventory feature flag compatible during tenant-policy
	// adoption. No legacy flag can add to the caller's effective module set.
	return [
		...effectiveModules,
		...(effectiveModules.includes("INVENTORY_ASSETS") ? ["inventory"] : []),
	];
}
