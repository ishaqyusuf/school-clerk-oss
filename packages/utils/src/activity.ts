/**
 * Activity contract shared by the db writer, the API feed, the notification
 * fan-out and the dashboard renderer (ADR-0093).
 *
 * Rules:
 * - Meta is a self-contained snapshot: every name the sentence needs (student,
 *   class, term, amount) is stored at write time, so rendering never joins.
 * - Sentences are rendered from typed `ActivityPart`s, never stored as HTML.
 * - Legacy rows whose meta does not match fall back to title/description.
 *
 * Pure TypeScript only: this module is imported by client components.
 */

export const ACTIVITY_CATEGORIES = [
	"attendance",
	"students",
	"finance",
	"academics",
	"assessments",
	"assistant",
	"system",
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

/** Mirrors the Prisma `ActivityType` enum. Keep both in sync. */
export const ACTIVITY_TYPES = [
	"wallet_created",
	"student_fee_created",
	"student_fee_cancelled",
	"student_payment_received",
	"student_payment_refund",
	"student_payment_cancelled",
	"student_payment_transaction_cancelled",
	"student_payment_transaction_created",
	"finance_payment_import_created",
	"finance_payment_import_completed",
	"finance_payment_import_retried",
	"finance_payment_import_row_failed",
	"student_term_created",
	"student_term_cancelled",
	"student_withdrawn",
	"student_readmitted",
	"student_created",
	"student_enrolled",
	"student_class_changed",
	"student_deleted",
	"student_payment_reversed",
	"students_promoted",
	"assistant_run",
	"assistant_action_requested",
	"assistant_action_completed",
	"assistant_action_blocked",
	"assessment_public_link_created",
	"assessment_public_link_requested",
	"assessment_public_link_approved",
	"assessment_public_link_rejected",
	"assessment_public_link_revoked",
	"assessment_public_link_score_recorded",
	"assessment_workbook_downloaded",
	"assessment_workbook_imported",
	"academic_term_setup_completed",
	"academic_term_activated",
	"academic_term_closed",
	"attendance_created",
	"attendance_updated",
	"attendance_deleted",
] as const;
export type ActivityTypeName = (typeof ACTIVITY_TYPES)[number];

export function isActivityType(value: string): value is ActivityTypeName {
	return (ACTIVITY_TYPES as readonly string[]).includes(value);
}

/** A named reference snapshot. */
export type ActivityRef = { id: string; name: string };

export type AttendanceCounts = {
	total: number;
	present: number;
	absent: number;
	late: number;
	excused: number;
	leave: number;
};

/**
 * Typed meta for the types the activity feed renders richly. Types missing
 * from this map are recorded with free-form meta and render from
 * title/description.
 */
export type ActivityMetaMap = {
	attendance_created: {
		attendanceId: string;
		classroom: ActivityRef;
		/** Attendance day, `YYYY-MM-DD`. */
		date: string;
		term?: ActivityRef | null;
		counts: AttendanceCounts;
	};
	attendance_updated: {
		attendanceId: string;
		classroom: ActivityRef;
		date: string;
		term?: ActivityRef | null;
		counts: AttendanceCounts;
	};
	attendance_deleted: {
		attendanceId: string;
		classroom: ActivityRef;
		date: string;
		term?: ActivityRef | null;
	};
	student_created: {
		student: ActivityRef;
		classroom?: ActivityRef | null;
		term?: ActivityRef | null;
		source: "manual" | "import" | "teacher_request" | "admission";
	};
	student_enrolled: {
		student: ActivityRef;
		classroom: ActivityRef;
		term: ActivityRef;
	};
	student_class_changed: {
		student: ActivityRef;
		from: ActivityRef | null;
		to: ActivityRef;
		term: ActivityRef;
	};
	/** Student removed from a term sheet. */
	student_term_cancelled: {
		student: ActivityRef;
		classroom?: ActivityRef | null;
		term: ActivityRef;
	};
	student_deleted: {
		student: ActivityRef;
	};
	student_withdrawn: {
		studentId: string;
		student?: ActivityRef;
		withdrawalId: string;
		withdrawalTermId: string;
		term?: ActivityRef;
		lastEnrolledDate: string;
		reason: string;
	};
	student_readmitted: {
		studentId: string;
		student?: ActivityRef;
		withdrawalId?: string;
		term?: ActivityRef;
	};
	students_promoted: {
		count: number;
		fromTerm?: ActivityRef | null;
		toTerm: ActivityRef;
		classrooms?: ActivityRef[];
	};
	student_payment_received: {
		paymentId: string;
		student: ActivityRef;
		/** Major units (naira), positive. */
		amount: number;
		currency?: string;
		method?: string | null;
		reference?: string | null;
		/** Human purpose, e.g. "First Term fees" or fee names joined. */
		purpose?: string | null;
		term?: ActivityRef | null;
	};
	student_payment_reversed: {
		paymentId: string;
		student: ActivityRef;
		amount: number;
		currency?: string;
		method?: string | null;
		reason?: string | null;
	};
	finance_payment_import_completed: {
		importJobId?: string;
		created?: number;
		failed?: number;
		total?: number;
	};
	academic_term_activated: { term: ActivityRef };
	academic_term_closed: { term: ActivityRef };
	assessment_workbook_imported: {
		classroom?: ActivityRef | null;
		subject?: ActivityRef | null;
		rows?: number;
	};
};

export type RichActivityType = keyof ActivityMetaMap;
export type ActivityMeta<T extends ActivityTypeName> = T extends RichActivityType
	? ActivityMetaMap[T]
	: Record<string, unknown>;

/** Entity an activity is primarily about. */
export type ActivitySubjectType =
	| "student"
	| "classroom"
	| "attendance"
	| "payment"
	| "term"
	| "import"
	| "assessment";

export type ActivitySubject = { type: ActivitySubjectType; id: string };

/**
 * A segment of a rendered activity sentence. The renderer owns styling per
 * kind (actor bold, student coloured link, class chip, amount tabular...).
 */
export type ActivityPart =
	| { kind: "text"; text: string }
	| { kind: "actor"; text: string; userId?: string | null }
	| { kind: "student"; text: string; id: string }
	| { kind: "classroom"; text: string; id?: string }
	| { kind: "term"; text: string; id?: string }
	| { kind: "amount"; text: string; value: number; tone: "positive" | "negative" | "neutral" }
	| { kind: "count"; text: string; tone?: "positive" | "negative" | "warning" | "neutral" }
	| { kind: "date"; text: string; iso?: string }
	| { kind: "quote"; text: string };

/** What clicking an activity (or a notification derived from it) opens. */
export type ActivityAction =
	| { kind: "student"; studentId: string; tab?: "overview" | "academics" | "attendance" | "finance" }
	| { kind: "attendance"; attendanceId: string; classroomId?: string; date?: string }
	| { kind: "payment"; paymentId: string; studentId?: string }
	| { kind: "href"; href: string };

export type ActivityTone = "sky" | "emerald" | "rose" | "amber" | "violet" | "slate" | "indigo";

/** Notification action stored on Notification.action for activity fan-out. */
export type ActivityNotificationAction = {
	kind: "activity";
	activityId: string;
	type: ActivityTypeName;
	target?: ActivityAction | null;
	/** Snapshot so the bell renders the rich sentence without reading the activity. */
	parts?: ActivityPart[];
	category?: ActivityCategory;
	icon?: string;
	actor?: { userId: string | null; name: string };
};

export const ACTIVITY_NOTIFICATION_TYPE_PREFIX = "activity." as const;
export function activityNotificationType(type: ActivityTypeName) {
	return `${ACTIVITY_NOTIFICATION_TYPE_PREFIX}${type}` as const;
}
