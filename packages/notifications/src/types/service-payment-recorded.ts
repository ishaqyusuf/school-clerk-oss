import { z } from "zod";
import { financeBaseSchema, createFinanceTemplate, defineSchoolNotification } from "./shared";

const schema = financeBaseSchema.extend({
	expenseTitle: z.string().min(1),
});

export const servicePaymentRecorded = defineSchoolNotification({
	buildBody: (payload) =>
		`${payload.expenseTitle} was paid for ${payload.amount}.${payload.actorName ? ` Recorded by ${payload.actorName}.` : ""}`,
	buildEmailTemplate: (payload) => ({
		content: createFinanceTemplate({
			amount: payload.amount,
			ctaHref: payload.link ?? "/finance/payments",
			eventLabel: "Service payment recorded",
			message: `${payload.schoolName} recorded a service payment for ${payload.expenseTitle}.`,
			metadata: [
				{ label: "Expense", value: payload.expenseTitle },
				...(payload.actorName
					? [{ label: "Recorded by", value: payload.actorName }]
					: []),
			],
			schoolName: payload.schoolName,
			title: "Service payment recorded",
		}),
		subject: `${payload.schoolName}: service payment recorded`,
	}),
	buildLink: (payload) => payload.link ?? "/finance/payments",
	channels: ["in_app", "email"],
	schema,
	title: (payload) => `Service payment recorded: ${payload.expenseTitle}`,
	variant: "info",
});
