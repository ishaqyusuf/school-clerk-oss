import { z } from "zod";
import {
	createFinanceTemplate,
	defineSchoolNotification,
	financeBaseSchema,
	formatNotificationEmailSubject,
} from "./shared";

const schema = financeBaseSchema.extend({
	staffName: z.string().min(1),
});

export const payrollPaymentCancelled = defineSchoolNotification({
	buildBody: (payload) =>
		`${payload.staffName}'s payment worth ${payload.amount} was cancelled.${payload.actorName ? ` Cancelled by ${payload.actorName}.` : ""}`,
	buildEmailTemplate: (payload) => ({
		content: createFinanceTemplate({
			amount: payload.amount,
			ctaHref: payload.link ?? "/staff/payroll",
			eventLabel: "Payroll payment cancelled",
			message: `${payload.schoolName} cancelled a payroll payment for ${payload.staffName}.`,
			metadata: [
				{ label: "Staff", value: payload.staffName },
				...(payload.actorName
					? [{ label: "Cancelled by", value: payload.actorName }]
					: []),
			],
			schoolName: payload.schoolName,
			subtitle:
				"Review the payroll record before issuing a replacement payment.",
			title: "Payroll payment cancelled",
			tone: "warning",
		}),
		subject: formatNotificationEmailSubject(
			payload.schoolName,
			"payroll payment cancelled",
		),
	}),
	buildLink: (payload) => payload.link ?? "/staff/payroll",
	channels: ["in_app", "email"],
	schema,
	title: (payload) => `Payroll payment cancelled for ${payload.staffName}`,
	variant: "warning",
});
