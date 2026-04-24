import { z } from "zod";
import { financeBaseSchema, createFinanceTemplate, defineSchoolNotification } from "./shared";

const schema = financeBaseSchema.extend({
	staffName: z.string().min(1),
});

export const payrollPaymentRecorded = defineSchoolNotification({
	buildBody: (payload) =>
		`${payload.staffName} was paid ${payload.amount}.${payload.actorName ? ` Recorded by ${payload.actorName}.` : ""}`,
	buildEmailTemplate: (payload) => ({
		content: createFinanceTemplate({
			amount: payload.amount,
			ctaHref: payload.link ?? "/staff/payroll",
			eventLabel: "Payroll payment recorded",
			message: `${payload.schoolName} recorded a payroll payment for ${payload.staffName}.`,
			metadata: [
				{ label: "Staff", value: payload.staffName },
				...(payload.actorName
					? [{ label: "Recorded by", value: payload.actorName }]
					: []),
			],
			schoolName: payload.schoolName,
			title: "Payroll payment recorded",
		}),
		subject: `${payload.schoolName}: payroll payment recorded`,
	}),
	buildLink: (payload) => payload.link ?? "/staff/payroll",
	channels: ["in_app", "email"],
	schema,
	title: (payload) => `Payroll payment recorded for ${payload.staffName}`,
	variant: "success",
});
