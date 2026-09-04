import { z } from "zod";
import {
	createFinanceTemplate,
	defineSchoolNotification,
	financeBaseSchema,
	formatNotificationEmailSubject,
} from "./shared";

const schema = financeBaseSchema.extend({
	expenseTitle: z.string().min(1),
});

export const servicePaymentCancelled = defineSchoolNotification({
	buildBody: (payload) =>
		`${payload.expenseTitle} payment worth ${payload.amount} was cancelled.${payload.actorName ? ` Cancelled by ${payload.actorName}.` : ""}`,
	buildEmailTemplate: (payload) => ({
		content: createFinanceTemplate({
			amount: payload.amount,
			ctaHref: payload.link ?? "/finance/payments",
			eventLabel: "Service payment cancelled",
			message: `${payload.schoolName} cancelled a service payment for ${payload.expenseTitle}.`,
			metadata: [
				{ label: "Expense", value: payload.expenseTitle },
				...(payload.actorName
					? [{ label: "Cancelled by", value: payload.actorName }]
					: []),
			],
			schoolName: payload.schoolName,
			subtitle:
				"Review the service payment record and any remaining settlement balance.",
			title: "Service payment cancelled",
			tone: "warning",
		}),
		subject: formatNotificationEmailSubject(
			payload.schoolName,
			"service payment cancelled",
		),
	}),
	buildLink: (payload) => payload.link ?? "/finance/payments",
	channels: ["in_app", "email"],
	schema,
	title: (payload) => `Service payment cancelled: ${payload.expenseTitle}`,
	variant: "warning",
});
