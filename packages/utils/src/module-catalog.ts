import { z } from "zod";

export const MODULE_IDS = [
	"STUDENT_MANAGEMENT",
	"PARENT_PORTAL",
	"STAFF_MANAGEMENT",
	"ACADEMIC_PROGRAMS",
	"COURSES_SUBJECTS",
	"TIMETABLE",
	"ATTENDANCE",
	"ASSESSMENT_AND_EXAMS",
	"RESULTS_AND_REPORTS",
	"ADMISSION_ENROLLMENT",
	"BILLING_FINANCE",
	"COMMUNICATION",
	"ASSIGNMENTS",
	"LIBRARY",
	"HOSTEL",
	"TRANSPORT",
	"INVENTORY_ASSETS",
	"AI_ASSISTANT",
	"EXTERNAL_EXAMS",
] as const;

export const moduleIdSchema = z.enum(MODULE_IDS);
export type ModuleId = z.infer<typeof moduleIdSchema>;

export type ModuleDefinition = {
	label: string;
	description: string;
	dependencies: readonly ModuleId[];
};

// This is a capability/dependency catalog, not a subscription price list or
// release switch. A catalog entry alone never grants access or ships a feature.
export const MODULE_CATALOG: Record<ModuleId, ModuleDefinition> = {
	STUDENT_MANAGEMENT: {
		label: "Student management",
		description: "Student identity, directories, enrollment records and imports.",
		dependencies: [],
	},
	PARENT_PORTAL: {
		label: "Parent portal",
		description: "Family access to linked student information.",
		dependencies: ["STUDENT_MANAGEMENT"],
	},
	STAFF_MANAGEMENT: {
		label: "Staff management",
		description: "Staff identities, departments and teacher assignments.",
		dependencies: [],
	},
	ACADEMIC_PROGRAMS: {
		label: "Academic structure and programs",
		description: "Academic sessions, levels, classes, departments and programs.",
		dependencies: [],
	},
	COURSES_SUBJECTS: {
		label: "Courses and subjects",
		description: "Curriculum and subjects within the academic structure.",
		dependencies: ["ACADEMIC_PROGRAMS"],
	},
	TIMETABLE: {
		label: "Timetable",
		description: "Teaching schedules and subject allocations.",
		dependencies: ["COURSES_SUBJECTS", "STAFF_MANAGEMENT"],
	},
	ATTENDANCE: {
		label: "Attendance",
		description: "Student attendance within academic classes and terms.",
		dependencies: ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"],
	},
	ASSESSMENT_AND_EXAMS: {
		label: "Assessments and exams",
		description: "Internal assessment configuration and student score entry.",
		dependencies: ["STUDENT_MANAGEMENT", "COURSES_SUBJECTS"],
	},
	RESULTS_AND_REPORTS: {
		label: "Results and reports",
		description: "Student result computation, report sheets and printing.",
		dependencies: ["ASSESSMENT_AND_EXAMS"],
	},
	ADMISSION_ENROLLMENT: {
		label: "Admissions",
		description: "Application links, review and admission into academic classes.",
		dependencies: ["STUDENT_MANAGEMENT", "ACADEMIC_PROGRAMS"],
	},
	BILLING_FINANCE: {
		label: "Billing and finance",
		description: "Accounts, charges, collections, payables and ledger records.",
		dependencies: [],
	},
	COMMUNICATION: {
		label: "Communication",
		description: "School messaging and communication workflows.",
		dependencies: [],
	},
	ASSIGNMENTS: {
		label: "Assignments",
		description: "Student coursework linked to curriculum subjects.",
		dependencies: ["STUDENT_MANAGEMENT", "COURSES_SUBJECTS"],
	},
	LIBRARY: {
		label: "Library",
		description: "Library catalog and lending workflows.",
		dependencies: [],
	},
	HOSTEL: {
		label: "Hostel",
		description: "Student accommodation and room allocation.",
		dependencies: ["STUDENT_MANAGEMENT"],
	},
	TRANSPORT: {
		label: "Transport",
		description: "School transport and student route assignments.",
		dependencies: ["STUDENT_MANAGEMENT"],
	},
	INVENTORY_ASSETS: {
		label: "Inventory and assets",
		description: "Asset inventory and issuance workflows.",
		dependencies: [],
	},
	AI_ASSISTANT: {
		label: "AI assistant",
		description: "Assistant access; every tool still requires its domain modules.",
		dependencies: [],
	},
	EXTERNAL_EXAMS: {
		label: "External examinations",
		description: "External exam bodies, candidates, registrations and results.",
		dependencies: [],
	},
};
