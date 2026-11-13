import type { ActivityPart, ActivityTone } from "@school-clerk/utils/activity";
import {
	ACTIVITY_CATEGORY_LABELS,
	type ActivityDetail,
	type ActivityTypeConfig,
	activityPartsToText,
} from "./activities";
import {
	type NotificationEmailTemplate,
	createFinanceTemplate,
	formatNotificationEmailSubject,
} from "./types/shared";

const EMAIL_TONE: Record<ActivityTone, "info" | "success" | "warning"> = {
	emerald: "success",
	rose: "warning",
	amber: "warning",
	sky: "info",
	violet: "info",
	slate: "info",
	indigo: "info",
};

const MAX_SUBJECT_MESSAGE = 120;

/**
 * Activity notification email (ADR-0093), rendered with the shared Clerk
 * Ledger `finance-notification` layout. Server-only: imports React Email.
 */
export function createActivityNotificationEmail(input: {
	config: Pick<ActivityTypeConfig, "label" | "category" | "tone">;
	parts: readonly ActivityPart[];
	details: readonly ActivityDetail[];
	schoolName: string;
	/** Absolute dashboard URL, or null when the activity has no target. */
	link: string | null;
	recipientName?: string | null;
}): NotificationEmailTemplate {
	const sentence = activityPartsToText(input.parts);
	const amount = input.parts.find((part) => part.kind === "amount")?.text;
	const subjectMessage =
		sentence.length > MAX_SUBJECT_MESSAGE
			? `${sentence.slice(0, MAX_SUBJECT_MESSAGE - 1).trimEnd()}…`
			: sentence;
	return {
		content: createFinanceTemplate({
			amount,
			category: ACTIVITY_CATEGORY_LABELS[input.config.category],
			ctaHref: input.link,
			ctaLabel: "Open in School Clerk",
			eventLabel: input.config.label,
			greetingName: input.recipientName ?? null,
			message: sentence,
			metadata: input.details
				.filter((item) => item.label !== "Amount")
				.map((item) => ({ ...item })),
			schoolName: input.schoolName,
			title: input.config.label,
			tone: EMAIL_TONE[input.config.tone],
		}),
		subject: formatNotificationEmailSubject(input.schoolName, subjectMessage),
	};
}
