import { z } from "zod";
import { defineSchoolNotification, financeBaseSchema, createFinanceTemplate } from "./shared";

const schema = financeBaseSchema.extend({
	paymentMethod: z.string().optional().nullable(),
	studentName: z.string().min(1),
});

export const studentPaymentReceived = defineSchoolNotification({
	buildBody: (payload) =>
		`${payload.studentName} paid ${payload.amount}${payload.paymentMethod ? ` via ${payload.paymentMethod}` : ""}.${payload.actorName ? ` Recorded by ${payload.actorName}.` : ""}`,
	buildEmailTemplate: (payload) => ({
		content: createFinanceTemplate({
			amount: payload.amount,
			ctaHref: payload.link ?? "/finance/transactions",
			eventLabel: "Student payment received",
			greetingName: payload.studentName,
			message: `${payload.schoolName} has recorded a student payment for ${payload.studentName}.`,
			metadata: [
				{ label: "Student", value: payload.studentName },
				...(payload.paymentMethod
					? [{ label: "Method", value: payload.paymentMethod }]
					: []),
				...(payload.actorName
					? [{ label: "Recorded by", value: payload.actorName }]
					: []),
			],
			schoolName: payload.schoolName,
			title: `Payment received from ${payload.studentName}`,
		}),
		subject: `${payload.schoolName}: payment received from ${payload.studentName}`,
	}),
	buildLink: (payload) => payload.link ?? "/finance/transactions",
	channels: ["in_app", "email"],
	schema,
	title: (payload) => `Payment received from ${payload.studentName}`,
	variant: "success",
});
