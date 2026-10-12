export const assistantToolCatalog = {
	searchStudents: { title: "Students", version: 1, href: "/students/list" },
	listClassrooms: {
		title: "Classrooms",
		version: 1,
		href: "/academic/classes",
	},
	enrollStudent: {
		title: "Enroll student",
		version: 1,
		href: "/students/list",
	},
	moveStudentClass: {
		title: "Move student",
		version: 1,
		href: "/students/list",
	},
	getStudentPaymentData: {
		title: "Student fees",
		version: 1,
		href: "/finance",
	},
	receiveStudentPayment: {
		title: "Record payment",
		version: 1,
		href: "/finance",
	},
	searchInventoryItems: { title: "Inventory", version: 1, href: "/inventory" },
	createInventoryItem: {
		title: "Create inventory item",
		version: 1,
		href: "/inventory",
	},
	recordInventoryIssuance: {
		title: "Issue inventory",
		version: 1,
		href: "/inventory",
	},
	searchStaffMembers: { title: "Staff", version: 1, href: "/staff/teachers" },
	getTeacherWorkspaceSummary: {
		title: "Teacher workspace",
		version: 1,
		href: "/academic/classes",
	},
	getStudentAttendanceHistory: {
		title: "Attendance",
		version: 1,
		href: "/academic/classes",
	},
	recordAssessmentScores: {
		title: "Record assessment scores",
		version: 1,
		href: "/academic/classes",
	},
	searchGuardians: { title: "Guardians", version: 1, href: "/students/list" },
} as const;
export function assistantToolInfo(name: string) {
	return Object.hasOwn(assistantToolCatalog, name)
		? assistantToolCatalog[name as keyof typeof assistantToolCatalog]
		: null;
}
