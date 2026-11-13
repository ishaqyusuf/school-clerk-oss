import {
	ACTIVITY_TYPES,
	type ActivityAction,
	type ActivityCategory,
	type ActivityPart,
	type ActivityRef,
	type ActivityTone,
	type ActivityTypeName,
} from "@school-clerk/utils/activity";
import type { ModuleId } from "@school-clerk/utils/module-config";
import {
	formatActivityAmount,
	formatCount,
	formatLongDay,
	formatNumber,
	formatShortDay,
} from "./format";
import {
	type MetaRecord,
	asRecord,
	readCounts,
	readDay,
	readNumber,
	readRef,
	readRefs,
	readString,
} from "./meta";

/** Row columns the renderer may fall back to. */
export type ActivityRowSnapshot = {
	title?: string | null;
	description?: string | null;
	author?: string | null;
	userId?: string | null;
};

export type ActivityDetail = { label: string; value: string };

export type ActivityTypeConfig = {
	type: ActivityTypeName;
	label: string;
	category: ActivityCategory;
	tone: ActivityTone;
	/** lucide-react icon name in kebab case. */
	icon: string;
	/** Every module the viewer's school must have enabled to read the type. */
	modules: readonly ModuleId[];
	/** Lower-case roles allowed to read the type; omitted = any role. */
	roles?: readonly string[];
	/** False for types that may never be configured to notify. */
	notifiable: boolean;
	describe: (meta: unknown, row: ActivityRowSnapshot) => ActivityPart[];
	details: (meta: unknown) => ActivityDetail[];
	action: (meta: unknown) => ActivityAction | null;
};

type Definition = {
	label: string;
	category: ActivityCategory;
	tone: ActivityTone;
	icon: string;
	modules: readonly ModuleId[];
	roles?: readonly string[];
	notifiable?: boolean;
	/** Return null when the meta is insufficient; the caller falls back. */
	render?: (meta: MetaRecord, actor: ActivityPart) => ActivityPart[] | null;
	details?: (meta: MetaRecord) => (ActivityDetail | null)[];
	action?: (meta: MetaRecord) => ActivityAction | null;
};

const FINANCE_ROLES = ["admin", "accountant"] as const;
const STUDENT_FINANCE_MODULES = [
	"STUDENT_MANAGEMENT",
	"BILLING_FINANCE",
] as const;

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
	attendance: "Attendance",
	students: "Students",
	finance: "Finance",
	academics: "Academics",
	assessments: "Assessments",
	assistant: "Assistant",
	system: "System",
};

const text = (value: string): ActivityPart => ({ kind: "text", text: value });
const student = (ref: ActivityRef): ActivityPart => ({
	kind: "student",
	text: ref.name,
	id: ref.id,
});
const classroom = (ref: ActivityRef): ActivityPart => ({
	kind: "classroom",
	text: ref.name,
	id: ref.id,
});
const term = (ref: ActivityRef): ActivityPart => ({
	kind: "term",
	text: ref.name,
	id: ref.id,
});
const quote = (value: string): ActivityPart => ({ kind: "quote", text: value });
const day = (iso: string): ActivityPart => ({
	kind: "date",
	text: formatShortDay(iso),
	iso,
});
const detail = (
	label: string,
	value: string | null | undefined,
): ActivityDetail | null => (value ? { label, value } : null);

function actorPart(row: ActivityRowSnapshot): ActivityPart {
	const userId = row.userId && row.userId !== "system" ? row.userId : null;
	return { kind: "actor", text: row.author?.trim() || "School Clerk", userId };
}

function studentId(meta: MetaRecord) {
	return readRef(meta, "student")?.id ?? readString(meta, "studentId");
}

function studentAction(
	tab?: "overview" | "academics" | "attendance" | "finance",
) {
	return (meta: MetaRecord): ActivityAction | null => {
		const id = studentId(meta);
		return id
			? { kind: "student", studentId: id, ...(tab ? { tab } : {}) }
			: null;
	};
}

function paymentAction(meta: MetaRecord): ActivityAction | null {
	const paymentId = readString(meta, "paymentId");
	const id = studentId(meta);
	if (paymentId)
		return { kind: "payment", paymentId, ...(id ? { studentId: id } : {}) };
	return id ? { kind: "student", studentId: id, tab: "finance" } : null;
}

function attendanceAction(meta: MetaRecord): ActivityAction | null {
	const attendanceId = readString(meta, "attendanceId");
	if (!attendanceId) return null;
	// Legacy rows stored the classroom as `departmentId`.
	const classroomId =
		readRef(meta, "classroom")?.id ?? readString(meta, "departmentId");
	const date = readDay(meta, "date");
	return {
		kind: "attendance",
		attendanceId,
		...(classroomId ? { classroomId } : {}),
		...(date ? { date } : {}),
	};
}

function attendanceCountParts(meta: MetaRecord): ActivityPart[] {
	const counts = readCounts(meta, "counts");
	if (!counts) return [];
	const parts: ActivityPart[] = [
		text("—"),
		{
			kind: "count",
			text: `${formatNumber(counts.present)} present`,
			tone: "positive",
		},
		text("·"),
		{
			kind: "count",
			text: `${formatNumber(counts.absent)} absent`,
			tone: counts.absent > 0 ? "negative" : "neutral",
		},
	];
	if (counts.late > 0) {
		parts.push(text("·"), {
			kind: "count",
			text: `${formatNumber(counts.late)} late`,
			tone: "warning",
		});
	}
	return parts;
}

function attendanceRender(verb: string, withCounts: boolean) {
	return (meta: MetaRecord, actor: ActivityPart): ActivityPart[] | null => {
		const room = readRef(meta, "classroom");
		const date = readDay(meta, "date");
		if (!room || !date) return null;
		return [
			actor,
			text(verb),
			classroom(room),
			text("on"),
			day(date),
			...(withCounts ? attendanceCountParts(meta) : []),
		];
	};
}

function attendanceDetails(meta: MetaRecord) {
	const counts = readCounts(meta, "counts");
	const date = readDay(meta, "date");
	return [
		detail("Class", readRef(meta, "classroom")?.name),
		detail("Date", date ? formatLongDay(date) : null),
		detail("Term", readRef(meta, "term")?.name),
		...(counts
			? [
					detail("Present", formatNumber(counts.present)),
					detail("Absent", formatNumber(counts.absent)),
					detail("Late", formatNumber(counts.late)),
					detail("Excused", formatNumber(counts.excused)),
					detail("Leave", formatNumber(counts.leave)),
					detail("Total", formatNumber(counts.total)),
				]
			: []),
	];
}

function amountOf(meta: MetaRecord) {
	const amount = readNumber(meta, "amount");
	return amount === null ? null : Math.abs(amount);
}

function paymentDetails(meta: MetaRecord) {
	const amount = amountOf(meta);
	return [
		detail("Student", readRef(meta, "student")?.name),
		detail(
			"Amount",
			amount === null
				? null
				: formatActivityAmount(amount, readString(meta, "currency")),
		),
		detail("Method", readString(meta, "method")),
		detail("Reference", readString(meta, "reference")),
		detail("Purpose", readString(meta, "purpose")),
		detail("Term", readRef(meta, "term")?.name),
		detail("Reason", readString(meta, "reason")),
	];
}

function termRender(verb: string) {
	return (meta: MetaRecord, actor: ActivityPart) => {
		const ref = readRef(meta, "term");
		return ref ? [actor, text(verb), term(ref)] : null;
	};
}

const STUDENT_SOURCE_TEXT: Record<string, string> = {
	import: "via import",
	admission: "from an admission",
	teacher_request: "from a teacher request",
};

const definitions: Record<ActivityTypeName, Definition> = {
	// ── Attendance ────────────────────────────────────────────────────────
	attendance_created: {
		label: "Attendance taken",
		category: "attendance",
		tone: "sky",
		icon: "clipboard-check",
		modules: ["ATTENDANCE"],
		render: attendanceRender("took attendance for", true),
		details: attendanceDetails,
		action: attendanceAction,
	},
	attendance_updated: {
		label: "Attendance updated",
		category: "attendance",
		tone: "sky",
		icon: "clipboard-pen",
		modules: ["ATTENDANCE"],
		render: attendanceRender("updated attendance for", true),
		details: attendanceDetails,
		action: attendanceAction,
	},
	attendance_deleted: {
		label: "Attendance deleted",
		category: "attendance",
		tone: "rose",
		icon: "clipboard-x",
		modules: ["ATTENDANCE"],
		render: attendanceRender("deleted attendance for", false),
		details: attendanceDetails,
		// The attendance record no longer exists.
		action: () => null,
	},

	// ── Students ──────────────────────────────────────────────────────────
	student_created: {
		label: "Student added",
		category: "students",
		tone: "emerald",
		icon: "user-plus",
		modules: ["STUDENT_MANAGEMENT"],
		render: (meta, actor) => {
			const ref = readRef(meta, "student");
			if (!ref) return null;
			const room = readRef(meta, "classroom");
			const source = STUDENT_SOURCE_TEXT[readString(meta, "source") ?? ""];
			return [
				actor,
				text("added"),
				student(ref),
				...(room ? [text("to"), classroom(room)] : []),
				...(source ? [text(source)] : []),
			];
		},
		details: (meta) => [
			detail("Student", readRef(meta, "student")?.name),
			detail("Class", readRef(meta, "classroom")?.name),
			detail("Term", readRef(meta, "term")?.name),
			detail("Source", readString(meta, "source")?.replace(/_/g, " ")),
		],
		action: studentAction("overview"),
	},
	student_enrolled: {
		label: "Student enrolled",
		category: "students",
		tone: "emerald",
		icon: "user-check",
		modules: ["STUDENT_MANAGEMENT"],
		render: (meta, actor) => {
			const ref = readRef(meta, "student");
			const room = readRef(meta, "classroom");
			if (!ref || !room) return null;
			const termRef = readRef(meta, "term");
			return [
				actor,
				text("enrolled"),
				student(ref),
				text("in"),
				classroom(room),
				...(termRef ? [text("for"), term(termRef)] : []),
			];
		},
		details: (meta) => [
			detail("Student", readRef(meta, "student")?.name),
			detail("Class", readRef(meta, "classroom")?.name),
			detail("Term", readRef(meta, "term")?.name),
		],
		action: studentAction("overview"),
	},
	student_class_changed: {
		label: "Class changed",
		category: "students",
		tone: "indigo",
		icon: "arrow-right-left",
		modules: ["STUDENT_MANAGEMENT"],
		render: (meta, actor) => {
			const ref = readRef(meta, "student");
			const to = readRef(meta, "to");
			if (!ref || !to) return null;
			const from = readRef(meta, "from");
			return from
				? [
						actor,
						text("moved"),
						student(ref),
						text("from"),
						classroom(from),
						text("to"),
						classroom(to),
					]
				: [actor, text("assigned"), student(ref), text("to"), classroom(to)];
		},
		details: (meta) => [
			detail("Student", readRef(meta, "student")?.name),
			detail("From", readRef(meta, "from")?.name),
			detail("To", readRef(meta, "to")?.name),
			detail("Term", readRef(meta, "term")?.name),
		],
		action: studentAction("overview"),
	},
	student_term_created: {
		label: "Term sheet created",
		category: "students",
		tone: "emerald",
		icon: "calendar-plus",
		modules: ["STUDENT_MANAGEMENT"],
		action: studentAction("academics"),
	},
	student_term_cancelled: {
		label: "Removed from term",
		category: "students",
		tone: "amber",
		icon: "calendar-x",
		modules: ["STUDENT_MANAGEMENT"],
		render: (meta, actor) => {
			const ref = readRef(meta, "student");
			const termRef = readRef(meta, "term");
			if (!ref || !termRef) return null;
			const room = readRef(meta, "classroom");
			return room
				? [
						actor,
						text("removed"),
						student(ref),
						text("from"),
						classroom(room),
						text("for"),
						term(termRef),
					]
				: [actor, text("removed"), student(ref), text("from"), term(termRef)];
		},
		details: (meta) => [
			detail("Student", readRef(meta, "student")?.name),
			detail("Class", readRef(meta, "classroom")?.name),
			detail("Term", readRef(meta, "term")?.name),
		],
		action: studentAction("academics"),
	},
	student_deleted: {
		label: "Student deleted",
		category: "students",
		tone: "rose",
		icon: "user-x",
		modules: ["STUDENT_MANAGEMENT"],
		// The record is gone, so the name is quoted rather than linked.
		render: (meta, actor) => {
			const ref = readRef(meta, "student");
			return ref ? [actor, text("deleted student"), quote(ref.name)] : null;
		},
		details: (meta) => [detail("Student", readRef(meta, "student")?.name)],
		action: () => null,
	},
	student_withdrawn: {
		label: "Student withdrawn",
		category: "students",
		tone: "amber",
		icon: "user-minus",
		modules: ["STUDENT_MANAGEMENT"],
		render: (meta, actor) => {
			const ref = readRef(meta, "student");
			if (!ref) return null;
			const termRef = readRef(meta, "term");
			const reason = readString(meta, "reason");
			return [
				actor,
				text("withdrew"),
				student(ref),
				...(termRef ? [text("from"), term(termRef)] : []),
				...(reason ? [quote(reason)] : []),
			];
		},
		details: (meta) => {
			const lastDay = readDay(meta, "lastEnrolledDate");
			return [
				detail("Student", readRef(meta, "student")?.name),
				detail("Term", readRef(meta, "term")?.name),
				detail(
					"Last enrolled",
					lastDay
						? formatLongDay(lastDay)
						: readString(meta, "lastEnrolledDate"),
				),
				detail("Reason", readString(meta, "reason")),
			];
		},
		action: studentAction("overview"),
	},
	student_readmitted: {
		label: "Student readmitted",
		category: "students",
		tone: "emerald",
		icon: "user-round-check",
		modules: ["STUDENT_MANAGEMENT"],
		render: (meta, actor) => {
			const ref = readRef(meta, "student");
			if (!ref) return null;
			const termRef = readRef(meta, "term");
			return [
				actor,
				text("readmitted"),
				student(ref),
				...(termRef ? [text("for"), term(termRef)] : []),
			];
		},
		details: (meta) => [
			detail("Student", readRef(meta, "student")?.name),
			detail("Term", readRef(meta, "term")?.name),
		],
		action: studentAction("overview"),
	},
	students_promoted: {
		label: "Students promoted",
		category: "students",
		tone: "violet",
		icon: "graduation-cap",
		modules: ["STUDENT_MANAGEMENT"],
		render: (meta, actor) => {
			const count = readNumber(meta, "count");
			const toTerm = readRef(meta, "toTerm");
			if (count === null || !toTerm) return null;
			const fromTerm = readRef(meta, "fromTerm");
			return [
				actor,
				text("promoted"),
				{
					kind: "count",
					text: formatCount(count, "student"),
					tone: "positive",
				},
				...(fromTerm ? [text("from"), term(fromTerm)] : []),
				text("to"),
				term(toTerm),
			];
		},
		details: (meta) => {
			const count = readNumber(meta, "count");
			const rooms = readRefs(meta, "classrooms");
			return [
				detail("Students", count === null ? null : formatNumber(count)),
				detail("From", readRef(meta, "fromTerm")?.name),
				detail("To", readRef(meta, "toTerm")?.name),
				detail(
					"Classes",
					rooms.length ? rooms.map((room) => room.name).join(", ") : null,
				),
			];
		},
	},

	// ── Finance ───────────────────────────────────────────────────────────
	wallet_created: {
		label: "Wallet created",
		category: "finance",
		tone: "slate",
		icon: "wallet",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
	},
	student_fee_created: {
		label: "Fee applied",
		category: "finance",
		tone: "indigo",
		icon: "file-plus",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
		action: studentAction("finance"),
	},
	student_fee_cancelled: {
		label: "Fee cancelled",
		category: "finance",
		tone: "rose",
		icon: "file-x",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
		action: studentAction("finance"),
	},
	student_payment_received: {
		label: "Payment received",
		category: "finance",
		tone: "emerald",
		icon: "banknote",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
		render: (meta, actor) => {
			const ref = readRef(meta, "student");
			const amount = amountOf(meta);
			if (!ref || amount === null) return null;
			const method = readString(meta, "method");
			const purpose = readString(meta, "purpose");
			return [
				actor,
				text("received"),
				{
					kind: "amount",
					text: formatActivityAmount(amount, readString(meta, "currency")),
					value: amount,
					tone: "positive",
				},
				text("from"),
				student(ref),
				...(method ? [text(`via ${method}`)] : []),
				...(purpose ? [text(`for ${purpose}`)] : []),
			];
		},
		details: paymentDetails,
		action: paymentAction,
	},
	student_payment_reversed: {
		label: "Payment reversed",
		category: "finance",
		tone: "rose",
		icon: "undo-2",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
		render: (meta, actor) => {
			const ref = readRef(meta, "student");
			const amount = amountOf(meta);
			if (!ref || amount === null) return null;
			const reason = readString(meta, "reason");
			return [
				actor,
				text("reversed"),
				{
					kind: "amount",
					text: formatActivityAmount(amount, readString(meta, "currency")),
					value: amount,
					tone: "negative",
				},
				text("payment from"),
				student(ref),
				...(reason ? [quote(reason)] : []),
			];
		},
		details: paymentDetails,
		action: paymentAction,
	},
	student_payment_refund: {
		label: "Payment refunded",
		category: "finance",
		tone: "amber",
		icon: "receipt",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
		action: paymentAction,
	},
	student_payment_cancelled: {
		label: "Payment cancelled",
		category: "finance",
		tone: "rose",
		icon: "ban",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
		action: paymentAction,
	},
	student_payment_transaction_created: {
		label: "Transaction recorded",
		category: "finance",
		tone: "emerald",
		icon: "receipt",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
		action: paymentAction,
	},
	student_payment_transaction_cancelled: {
		label: "Transaction cancelled",
		category: "finance",
		tone: "rose",
		icon: "ban",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
		action: paymentAction,
	},
	finance_payment_import_created: {
		label: "Payment import started",
		category: "finance",
		tone: "slate",
		icon: "file-spreadsheet",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
	},
	finance_payment_import_completed: {
		label: "Payment import completed",
		category: "finance",
		tone: "emerald",
		icon: "file-check",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
		render: (meta, actor) => {
			// Legacy rows used importedRows/failedRows.
			const created =
				readNumber(meta, "created") ?? readNumber(meta, "importedRows");
			if (created === null) return null;
			const failed =
				readNumber(meta, "failed") ?? readNumber(meta, "failedRows") ?? 0;
			return [
				actor,
				text("imported"),
				{
					kind: "count",
					text: formatCount(created, "payment"),
					tone: "positive",
				},
				...(failed > 0
					? [
							text("·"),
							{
								kind: "count",
								text: `${formatNumber(failed)} failed`,
								tone: "negative",
							} as const,
						]
					: []),
			];
		},
		details: (meta) => {
			const created =
				readNumber(meta, "created") ?? readNumber(meta, "importedRows");
			const failed =
				readNumber(meta, "failed") ?? readNumber(meta, "failedRows");
			const total = readNumber(meta, "total") ?? readNumber(meta, "totalRows");
			return [
				detail("Imported", created === null ? null : formatNumber(created)),
				detail("Failed", failed === null ? null : formatNumber(failed)),
				detail("Total rows", total === null ? null : formatNumber(total)),
			];
		},
		action: () => ({ kind: "href", href: "/finance/payments" }),
	},
	finance_payment_import_retried: {
		label: "Payment import retried",
		category: "finance",
		tone: "amber",
		icon: "refresh-cw",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
	},
	finance_payment_import_row_failed: {
		label: "Payment import row failed",
		category: "finance",
		tone: "rose",
		icon: "triangle-alert",
		modules: STUDENT_FINANCE_MODULES,
		roles: FINANCE_ROLES,
	},

	// ── Academics ─────────────────────────────────────────────────────────
	academic_term_setup_completed: {
		label: "Term setup completed",
		category: "academics",
		tone: "indigo",
		icon: "list-checks",
		modules: ["ACADEMIC_PROGRAMS"],
		render: termRender("completed setup for"),
		details: (meta) => [detail("Term", readRef(meta, "term")?.name)],
	},
	academic_term_activated: {
		label: "Term activated",
		category: "academics",
		tone: "emerald",
		icon: "calendar-check",
		modules: ["ACADEMIC_PROGRAMS"],
		render: termRender("activated"),
		details: (meta) => [detail("Term", readRef(meta, "term")?.name)],
	},
	academic_term_closed: {
		label: "Term closed",
		category: "academics",
		tone: "slate",
		icon: "calendar-off",
		modules: ["ACADEMIC_PROGRAMS"],
		render: termRender("closed"),
		details: (meta) => [detail("Term", readRef(meta, "term")?.name)],
	},

	// ── Assessments ───────────────────────────────────────────────────────
	assessment_public_link_created: {
		label: "Recording link created",
		category: "assessments",
		tone: "violet",
		icon: "link",
		modules: ["ASSESSMENT_AND_EXAMS"],
	},
	assessment_public_link_requested: {
		label: "Recording link requested",
		category: "assessments",
		tone: "amber",
		icon: "link",
		modules: ["ASSESSMENT_AND_EXAMS"],
	},
	assessment_public_link_approved: {
		label: "Recording link approved",
		category: "assessments",
		tone: "emerald",
		icon: "link",
		modules: ["ASSESSMENT_AND_EXAMS"],
	},
	assessment_public_link_rejected: {
		label: "Recording link rejected",
		category: "assessments",
		tone: "rose",
		icon: "link-2-off",
		modules: ["ASSESSMENT_AND_EXAMS"],
	},
	assessment_public_link_revoked: {
		label: "Recording link revoked",
		category: "assessments",
		tone: "rose",
		icon: "link-2-off",
		modules: ["ASSESSMENT_AND_EXAMS"],
	},
	assessment_public_link_score_recorded: {
		label: "Score recorded via link",
		category: "assessments",
		tone: "violet",
		icon: "pen-line",
		modules: ["ASSESSMENT_AND_EXAMS"],
	},
	assessment_workbook_downloaded: {
		label: "Workbook downloaded",
		category: "assessments",
		tone: "slate",
		icon: "download",
		modules: ["ASSESSMENT_AND_EXAMS"],
		notifiable: false,
	},
	assessment_workbook_imported: {
		label: "Scores imported",
		category: "assessments",
		tone: "violet",
		icon: "upload",
		modules: ["ASSESSMENT_AND_EXAMS"],
		render: (meta, actor) => {
			const room = readRef(meta, "classroom");
			const subject = readRef(meta, "subject");
			if (!room && !subject) return null;
			const rows = readNumber(meta, "rows");
			return [
				actor,
				text("imported assessment scores for"),
				...(room ? [classroom(room)] : []),
				...(subject ? [text(room ? `· ${subject.name}` : subject.name)] : []),
				...(rows !== null
					? [
							text("—"),
							{
								kind: "count",
								text: formatCount(rows, "row"),
								tone: "neutral",
							} as const,
						]
					: []),
			];
		},
		details: (meta) => {
			const rows = readNumber(meta, "rows");
			return [
				detail("Class", readRef(meta, "classroom")?.name),
				detail("Subject", readRef(meta, "subject")?.name),
				detail("Rows", rows === null ? null : formatNumber(rows)),
			];
		},
	},

	// ── Assistant ─────────────────────────────────────────────────────────
	assistant_run: {
		label: "Assistant run",
		category: "assistant",
		tone: "slate",
		icon: "sparkles",
		modules: ["AI_ASSISTANT"],
		notifiable: false,
	},
	assistant_action_requested: {
		label: "Assistant action requested",
		category: "assistant",
		tone: "slate",
		icon: "bot",
		modules: ["AI_ASSISTANT"],
		notifiable: false,
	},
	assistant_action_completed: {
		label: "Assistant action completed",
		category: "assistant",
		tone: "emerald",
		icon: "bot",
		modules: ["AI_ASSISTANT"],
		notifiable: false,
	},
	assistant_action_blocked: {
		label: "Assistant action blocked",
		category: "assistant",
		tone: "rose",
		icon: "bot",
		modules: ["AI_ASSISTANT"],
		notifiable: false,
	},
};

function fallbackParts(
	label: string,
	row: ActivityRowSnapshot,
): ActivityPart[] {
	const body = row.description?.trim() || row.title?.trim() || label;
	return [actorPart(row), text(body)];
}

function build(
	type: ActivityTypeName,
	definition: Definition,
): ActivityTypeConfig {
	return {
		type,
		label: definition.label,
		category: definition.category,
		tone: definition.tone,
		icon: definition.icon,
		modules: definition.modules,
		...(definition.roles ? { roles: definition.roles } : {}),
		notifiable: definition.notifiable ?? true,
		describe: (meta, row) => {
			const record = asRecord(meta);
			if (record && definition.render) {
				try {
					const parts = definition.render(record, actorPart(row));
					if (parts) return parts;
				} catch {
					// Malformed meta falls through to the stored text.
				}
			}
			return fallbackParts(definition.label, row);
		},
		details: (meta) => {
			const record = asRecord(meta);
			if (!record || !definition.details) return [];
			try {
				return definition
					.details(record)
					.filter((item): item is ActivityDetail => item !== null);
			} catch {
				return [];
			}
		},
		action: (meta) => {
			const record = asRecord(meta);
			if (!record || !definition.action) return null;
			try {
				return definition.action(record);
			} catch {
				return null;
			}
		},
	};
}

export const ACTIVITY_REGISTRY = Object.fromEntries(
	ACTIVITY_TYPES.map((type) => [type, build(type, definitions[type])]),
) as Record<ActivityTypeName, ActivityTypeConfig>;
