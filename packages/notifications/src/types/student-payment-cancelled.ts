import { z } from "zod";
import {
	createFinanceTemplate,
	defineSchoolNotification,
	financeBaseSchema,
} from "./shared";

const schema = financeBaseSchema.extend({
	studentName: z.string().min(1),
});

export const studentPaymentCancelled = defineSchoolNotification({
	buildBody: (payload) =>
		`A payment for ${payload.studentName} worth ${payload.amount} was cancelled.${payload.actorName ? ` Cancelled by ${payload.actorName}.` : ""}`,
	buildEmailTemplate: (payload) => ({
		content: createFinanceTemplate({
			amount: payload.amount,
			ctaHref: payload.link ?? "/finance/transactions",
			eventLabel: "Student payment cancelled",
			greetingName: payload.studentName,
			message: `${payload.schoolName} cancelled a student payment for ${payload.studentName}.`,
			metadata: [
				{ label: "Student", value: payload.studentName },
				...(payload.actorName
					? [{ label: "Cancelled by", value: payload.actorName }]
					: []),
			],
			schoolName: payload.schoolName,
			title: `Payment cancelled for ${payload.studentName}`,
		}),
		subject: `${payload.schoolName}: payment cancelled for ${payload.studentName}`,
	}),
	buildLink: (payload) => payload.link ?? "/finance/transactions",
	channels: ["in_app", "email"],
	schema,
	title: (payload) => `Payment cancelled for ${payload.studentName}`,
	variant: "warning",
});
