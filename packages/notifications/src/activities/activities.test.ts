import { describe, expect, it } from "bun:test";
import {
	ACTIVITY_TYPES,
	type ActivityPart,
} from "@school-clerk/utils/activity";
import {
	MODULE_IDS,
	evaluateModuleSelection,
} from "@school-clerk/utils/module-config";
import {
	canReadSchoolNotification,
	getReadableSchoolNotificationTypes,
	getSchoolNotificationAccessKey,
} from "../module-policy";
import {
	ACTIVITY_REGISTRY,
	type ActivityRowSnapshot,
	activityActionHref,
	activityPartsToText,
	canReadActivityType,
	getActivityTypeConfig,
	listActivityTypesByCategory,
	listNotifiableActivityTypes,
	listReadableActivityTypes,
} from "./index";

const row: ActivityRowSnapshot = {
	author: "Aisha Bello",
	userId: "user-1",
	title: null,
	description: null,
};
const primary3a = { id: "class-1", name: "Primary 3A" };
const student = { id: "student-1", name: "Abdullahi Musa" };
const firstTerm = { id: "term-1", name: "First Term" };

function describeType(
	type: keyof typeof ACTIVITY_REGISTRY,
	meta: unknown,
	overrides: ActivityRowSnapshot = {},
) {
	return ACTIVITY_REGISTRY[type].describe(meta, { ...row, ...overrides });
}

function text(parts: ActivityPart[]) {
	return activityPartsToText(parts);
}

const allModules = evaluateModuleSelection({
	enabledModules: MODULE_IDS,
	entitledModules: MODULE_IDS,
});
const noFinance = evaluateModuleSelection({
	enabledModules: MODULE_IDS.filter((id) => id !== "BILLING_FINANCE"),
	entitledModules: MODULE_IDS,
});

describe("activity registry", () => {
	it("configures every activity type", () => {
		for (const type of ACTIVITY_TYPES) {
			const config = ACTIVITY_REGISTRY[type];
			expect(config.type).toBe(type);
			expect(config.label.length).toBeGreaterThan(0);
			expect(config.icon).toMatch(/^[a-z0-9-]+$/);
			expect(config.modules.length).toBeGreaterThan(0);
		}
		expect(getActivityTypeConfig("not_a_type")).toBeNull();
	});

	it("keeps assistant and workbook downloads out of notifications", () => {
		const notifiable = listNotifiableActivityTypes();
		expect(notifiable).not.toContain("assistant_run");
		expect(notifiable).not.toContain("assessment_workbook_downloaded");
		expect(notifiable).toContain("attendance_created");
	});

	it("groups types by category in catalogue order", () => {
		const groups = listActivityTypesByCategory([
			"student_payment_received",
			"attendance_created",
			"student_created",
		]);
		expect(groups.map((group) => group.category)).toEqual([
			"attendance",
			"students",
			"finance",
		]);
		expect(groups[0]?.label).toBe("Attendance");
	});
});

describe("describe", () => {
	it("renders attendance taken with counts", () => {
		const parts = describeType("attendance_created", {
			attendanceId: "att-1",
			classroom: primary3a,
			date: "2026-11-13",
			counts: {
				total: 30,
				present: 28,
				absent: 2,
				late: 0,
				excused: 0,
				leave: 0,
			},
		});
		expect(parts[0]).toEqual({
			kind: "actor",
			text: "Aisha Bello",
			userId: "user-1",
		});
		expect(parts).toContainEqual({
			kind: "classroom",
			text: "Primary 3A",
			id: "class-1",
		});
		expect(parts).toContainEqual({
			kind: "date",
			text: "13 Nov",
			iso: "2026-11-13",
		});
		expect(parts).toContainEqual({
			kind: "count",
			text: "28 present",
			tone: "positive",
		});
		expect(parts).toContainEqual({
			kind: "count",
			text: "2 absent",
			tone: "negative",
		});
		expect(text(parts)).toBe(
			"Aisha Bello took attendance for Primary 3A on 13 Nov — 28 present · 2 absent",
		);
	});

	it("adds late counts and renders updates/deletes", () => {
		const meta = {
			attendanceId: "att-1",
			classroom: primary3a,
			date: "2026-11-13",
			counts: {
				total: 30,
				present: 27,
				absent: 2,
				late: 1,
				excused: 0,
				leave: 0,
			},
		};
		expect(text(describeType("attendance_updated", meta))).toBe(
			"Aisha Bello updated attendance for Primary 3A on 13 Nov — 27 present · 2 absent · 1 late",
		);
		expect(text(describeType("attendance_deleted", meta))).toBe(
			"Aisha Bello deleted attendance for Primary 3A on 13 Nov",
		);
	});

	it("renders a received payment with method and purpose", () => {
		const parts = describeType("student_payment_received", {
			paymentId: "pay-1",
			student,
			amount: 45000,
			method: "Cash",
			purpose: "First Term fees",
		});
		expect(parts).toContainEqual({
			kind: "amount",
			text: "₦45,000",
			value: 45000,
			tone: "positive",
		});
		expect(parts).toContainEqual({
			kind: "student",
			text: "Abdullahi Musa",
			id: "student-1",
		});
		expect(text(parts)).toBe(
			"Aisha Bello received ₦45,000 from Abdullahi Musa via Cash for First Term fees",
		);
	});

	it("renders a reversed payment with its reason", () => {
		const parts = describeType("student_payment_reversed", {
			paymentId: "pay-1",
			student,
			amount: 12500.5,
			reason: "Duplicate entry",
		});
		expect(parts).toContainEqual({
			kind: "amount",
			text: "₦12,500.50",
			value: 12500.5,
			tone: "negative",
		});
		expect(text(parts)).toBe(
			"Aisha Bello reversed ₦12,500.50 payment from Abdullahi Musa “Duplicate entry”",
		);
	});

	it("renders class changes with and without a previous class", () => {
		const to = { id: "class-2", name: "Primary 3B" };
		expect(
			text(
				describeType("student_class_changed", {
					student,
					from: primary3a,
					to,
					term: firstTerm,
				}),
			),
		).toBe("Aisha Bello moved Abdullahi Musa from Primary 3A to Primary 3B");
		expect(
			text(
				describeType("student_class_changed", {
					student,
					from: null,
					to,
					term: firstTerm,
				}),
			),
		).toBe("Aisha Bello assigned Abdullahi Musa to Primary 3B");
	});

	it("renders student lifecycle types", () => {
		expect(
			text(
				describeType("student_created", {
					student,
					classroom: primary3a,
					source: "import",
				}),
			),
		).toBe("Aisha Bello added Abdullahi Musa to Primary 3A via import");
		expect(
			text(
				describeType("student_enrolled", {
					student,
					classroom: primary3a,
					term: firstTerm,
				}),
			),
		).toBe("Aisha Bello enrolled Abdullahi Musa in Primary 3A for First Term");
		expect(
			text(
				describeType("student_term_cancelled", {
					student,
					classroom: primary3a,
					term: firstTerm,
				}),
			),
		).toBe("Aisha Bello removed Abdullahi Musa from Primary 3A for First Term");
		expect(text(describeType("student_deleted", { student }))).toBe(
			"Aisha Bello deleted student “Abdullahi Musa”",
		);
		expect(
			text(
				describeType("student_withdrawn", {
					studentId: student.id,
					student,
					withdrawalId: "w-1",
					withdrawalTermId: "term-1",
					term: firstTerm,
					lastEnrolledDate: "2026-11-01",
					reason: "Relocated",
				}),
			),
		).toBe("Aisha Bello withdrew Abdullahi Musa from First Term “Relocated”");
		expect(
			text(
				describeType("student_readmitted", {
					studentId: student.id,
					student,
					term: firstTerm,
				}),
			),
		).toBe("Aisha Bello readmitted Abdullahi Musa for First Term");
	});

	it("renders promotions, terms, imports and workbooks", () => {
		expect(
			text(
				describeType("students_promoted", {
					count: 42,
					fromTerm: { id: "t0", name: "Third Term 2025/26" },
					toTerm: firstTerm,
				}),
			),
		).toBe(
			"Aisha Bello promoted 42 students from Third Term 2025/26 to First Term",
		);
		expect(
			text(describeType("academic_term_activated", { term: firstTerm })),
		).toBe("Aisha Bello activated First Term");
		expect(
			text(describeType("academic_term_closed", { term: firstTerm })),
		).toBe("Aisha Bello closed First Term");
		expect(
			text(
				describeType("finance_payment_import_completed", {
					created: 18,
					failed: 2,
					total: 20,
				}),
			),
		).toBe("Aisha Bello imported 18 payments · 2 failed");
		// Legacy import meta.
		expect(
			text(
				describeType("finance_payment_import_completed", {
					jobId: "j",
					importedRows: 1,
					failedRows: 0,
				}),
			),
		).toBe("Aisha Bello imported 1 payment");
		expect(
			text(
				describeType("assessment_workbook_imported", {
					classroom: primary3a,
					subject: { id: "s1", name: "Mathematics" },
					rows: 30,
				}),
			),
		).toBe(
			"Aisha Bello imported assessment scores for Primary 3A · Mathematics — 30 rows",
		);
	});

	it("falls back to stored text for legacy or malformed meta", () => {
		const legacy = {
			attendanceId: "att-1",
			departmentId: "class-1",
			sessionTermId: "term-1",
		};
		expect(
			describeType("attendance_created", legacy, {
				description: "Attendance recorded for Primary 3A",
			}),
		).toEqual([
			{ kind: "actor", text: "Aisha Bello", userId: "user-1" },
			{ kind: "text", text: "Attendance recorded for Primary 3A" },
		]);
		expect(
			text(
				describeType(
					"student_withdrawn",
					{ studentId: "student-1", reason: "x" },
					{ title: "Student withdrawn" },
				),
			),
		).toBe("Aisha Bello Student withdrawn");
		expect(
			text(
				describeType("student_payment_received", "not-an-object", {
					author: null,
					userId: "system",
				}),
			),
		).toBe("School Clerk Payment received");
		expect(
			describeType("student_payment_received", null, { userId: "system" })[0],
		).toEqual({
			kind: "actor",
			text: "Aisha Bello",
			userId: null,
		});
		expect(
			text(
				describeType("student_payment_received", {
					student: { id: 4 },
					amount: "45000",
				}),
			),
		).toBe("Aisha Bello Payment received");
	});
});

describe("details and actions", () => {
	it("lists attendance details and links legacy attendance rows", () => {
		const details = ACTIVITY_REGISTRY.attendance_created.details({
			attendanceId: "att-1",
			classroom: primary3a,
			date: "2026-11-13",
			counts: {
				total: 30,
				present: 28,
				absent: 2,
				late: 0,
				excused: 0,
				leave: 0,
			},
		});
		expect(details).toContainEqual({
			label: "Date",
			value: "Fri, 13 Nov 2026",
		});
		expect(details).toContainEqual({ label: "Present", value: "28" });

		const legacyAction = ACTIVITY_REGISTRY.attendance_created.action({
			attendanceId: "att-1",
			departmentId: "class-1",
		});
		expect(legacyAction).toEqual({
			kind: "attendance",
			attendanceId: "att-1",
			classroomId: "class-1",
		});
		expect(activityActionHref(legacyAction)).toBe(
			"/academic/classes?viewClassroomId=class-1&classroomTab=attendance&attendanceSessionId=att-1&secondaryTab=attendance-overview",
		);
	});

	it("builds student and payment actions", () => {
		const legacyWithdrawal = ACTIVITY_REGISTRY.student_withdrawn.action({
			studentId: "student-1",
		});
		expect(legacyWithdrawal).toEqual({
			kind: "student",
			studentId: "student-1",
			tab: "overview",
		});
		expect(activityActionHref(legacyWithdrawal)).toBe(
			"/students?studentViewId=student-1&studentViewTab=overview",
		);

		const payment = ACTIVITY_REGISTRY.student_payment_received.action({
			paymentId: "pay-1",
			student,
			amount: 1,
		});
		expect(payment).toEqual({
			kind: "payment",
			paymentId: "pay-1",
			studentId: "student-1",
		});
		expect(activityActionHref(payment)).toBe(
			"/students?studentViewId=student-1&studentViewTab=finance",
		);
		expect(ACTIVITY_REGISTRY.student_deleted.action({ student })).toBeNull();
		expect(
			activityActionHref({ kind: "href", href: "https://evil.example" }),
		).toBeNull();
	});
});

describe("read policy", () => {
	it("restricts finance activity to admin and accountant with finance enabled", () => {
		expect(
			canReadActivityType("student_payment_received", allModules, "Admin"),
		).toBe(true);
		expect(
			canReadActivityType("student_payment_received", allModules, "accountant"),
		).toBe(true);
		expect(
			canReadActivityType("student_payment_received", allModules, "Teacher"),
		).toBe(false);
		expect(
			canReadActivityType("student_payment_received", noFinance, "Admin"),
		).toBe(false);
		expect(
			canReadActivityType("attendance_created", allModules, "Teacher"),
		).toBe(true);
		expect(canReadActivityType("unknown", allModules, "Admin")).toBe(false);
	});

	it("denies every type for unconfigured schools", () => {
		const unconfigured = evaluateModuleSelection({
			enabledModules: [],
			entitledModules: [],
		});
		expect(listReadableActivityTypes(unconfigured, "Admin")).toEqual([]);
	});

	it("routes activity.<type> notifications through the activity policy", () => {
		expect(
			canReadSchoolNotification(
				"activity.attendance_created",
				allModules,
				"Teacher",
			),
		).toBe(true);
		expect(
			canReadSchoolNotification(
				"activity.student_payment_received",
				allModules,
				"Teacher",
			),
		).toBe(false);
		expect(
			canReadSchoolNotification("activity.assistant_run", allModules, "Admin"),
		).toBe(false);
		expect(
			canReadSchoolNotification("activity.bogus", allModules, "Admin"),
		).toBe(false);

		const adminTypes = getReadableSchoolNotificationTypes(allModules, "Admin");
		expect(adminTypes).toContain("student_payment_received");
		expect(adminTypes).toContain("activity.student_payment_received");
		expect(
			getReadableSchoolNotificationTypes(noFinance, "Admin"),
		).not.toContain("activity.student_payment_received");
	});

	it("derives a compact, policy-sensitive access key", () => {
		const admin = getSchoolNotificationAccessKey(allModules, "Admin");
		expect(admin).toMatch(/^v2:\d+:[0-9a-f]{8}$/);
		expect(getSchoolNotificationAccessKey(allModules, "admin")).toBe(admin);
		expect(getSchoolNotificationAccessKey(allModules, "Teacher")).not.toBe(
			admin,
		);
		expect(getSchoolNotificationAccessKey(noFinance, "Admin")).not.toBe(admin);
	});
});

describe("withdrawal details", () => {
	it("formats a local-midnight ISO last-enrolled date as a calendar day", () => {
		const config = getActivityTypeConfig("student_withdrawn");
		const details = config?.details({
			studentId: "s1",
			withdrawalId: "w1",
			withdrawalTermId: "t1",
			lastEnrolledDate: "2026-11-11T23:00:00.000Z",
			reason: "Relocated",
		});
		expect(details?.find((d) => d.label === "Last enrolled")?.value).toBe(
			"Thu, 12 Nov 2026",
		);
	});
});
