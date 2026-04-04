import * as React from "react";
import { z } from "zod";
import {
	FinanceNotificationEmail,
	type FinanceNotificationEmailProps,
} from "@school-clerk/email/emails/finance-notification";

export type NotificationChannel = "email" | "in_app";
export type NotificationVariant = "info" | "success" | "warning" | "error";

export type NotificationEmailTemplate = {
	subject: string;
	content: React.ReactElement;
};

type NotificationDefinition<TSchema extends z.ZodTypeAny> = {
	channels: NotificationChannel[];
	schema: TSchema;
	variant: NotificationVariant;
	buildBody: (payload: z.infer<TSchema>) => string | null;
	buildEmailTemplate: (
		payload: z.infer<TSchema>,
	) => NotificationEmailTemplate | null;
	buildLink: (payload: z.infer<TSchema>) => string | null;
	buildTitle: (payload: z.infer<TSchema>) => string;
};

type AnyNotificationDefinition = NotificationDefinition<z.ZodTypeAny>;
type NotificationRegistry = Record<string, AnyNotificationDefinition>;

function defineNotification<TSchema extends z.ZodTypeAny>(
	definition: NotificationDefinition<TSchema>,
) {
	return definition;
}

const currencySchema = z.string().min(1);

const financeBaseSchema = z.object({
	actorName: z.string().optional().nullable(),
	amount: currencySchema,
	link: z.string().optional().nullable(),
	schoolName: z.string().min(1),
});

const studentPaymentReceivedSchema = financeBaseSchema.extend({
	paymentMethod: z.string().optional().nullable(),
	studentName: z.string().min(1),
});

const studentPaymentCancelledSchema = financeBaseSchema.extend({
	studentName: z.string().min(1),
});

const servicePaymentRecordedSchema = financeBaseSchema.extend({
	expenseTitle: z.string().min(1),
});

const servicePaymentCancelledSchema = financeBaseSchema.extend({
	expenseTitle: z.string().min(1),
});

const payrollPaymentRecordedSchema = financeBaseSchema.extend({
	staffName: z.string().min(1),
});

const payrollPaymentCancelledSchema = financeBaseSchema.extend({
	staffName: z.string().min(1),
});

function createFinanceTemplate(props: FinanceNotificationEmailProps) {
	return React.createElement(FinanceNotificationEmail, props);
}

export const schoolClerkNotificationTypes = {
	student_payment_received: defineNotification({
		channels: ["in_app", "email"],
		schema: studentPaymentReceivedSchema,
		variant: "success",
		buildTitle: (payload) => `Payment received from ${payload.studentName}`,
		buildBody: (payload) =>
			`${payload.studentName} paid ${payload.amount}${payload.paymentMethod ? ` via ${payload.paymentMethod}` : ""}.${payload.actorName ? ` Recorded by ${payload.actorName}.` : ""}`,
		buildLink: (payload) => payload.link ?? "/finance/transactions",
		buildEmailTemplate: (payload) => ({
			subject: `${payload.schoolName}: payment received from ${payload.studentName}`,
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
		}),
	}),
	student_payment_cancelled: defineNotification({
		channels: ["in_app", "email"],
		schema: studentPaymentCancelledSchema,
		variant: "warning",
		buildTitle: (payload) => `Payment cancelled for ${payload.studentName}`,
		buildBody: (payload) =>
			`A payment for ${payload.studentName} worth ${payload.amount} was cancelled.${payload.actorName ? ` Cancelled by ${payload.actorName}.` : ""}`,
		buildLink: (payload) => payload.link ?? "/finance/transactions",
		buildEmailTemplate: (payload) => ({
			subject: `${payload.schoolName}: payment cancelled for ${payload.studentName}`,
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
		}),
	}),
	service_payment_recorded: defineNotification({
		channels: ["in_app", "email"],
		schema: servicePaymentRecordedSchema,
		variant: "info",
		buildTitle: (payload) => `Service payment recorded: ${payload.expenseTitle}`,
		buildBody: (payload) =>
			`${payload.expenseTitle} was paid for ${payload.amount}.${payload.actorName ? ` Recorded by ${payload.actorName}.` : ""}`,
		buildLink: (payload) => payload.link ?? "/finance/payments",
		buildEmailTemplate: (payload) => ({
			subject: `${payload.schoolName}: service payment recorded`,
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
				title: `Service payment recorded`,
			}),
		}),
	}),
	service_payment_cancelled: defineNotification({
		channels: ["in_app", "email"],
		schema: servicePaymentCancelledSchema,
		variant: "warning",
		buildTitle: (payload) => `Service payment cancelled: ${payload.expenseTitle}`,
		buildBody: (payload) =>
			`${payload.expenseTitle} payment worth ${payload.amount} was cancelled.${payload.actorName ? ` Cancelled by ${payload.actorName}.` : ""}`,
		buildLink: (payload) => payload.link ?? "/finance/payments",
		buildEmailTemplate: (payload) => ({
			subject: `${payload.schoolName}: service payment cancelled`,
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
				title: `Service payment cancelled`,
			}),
		}),
	}),
	payroll_payment_recorded: defineNotification({
		channels: ["in_app", "email"],
		schema: payrollPaymentRecordedSchema,
		variant: "success",
		buildTitle: (payload) => `Payroll payment recorded for ${payload.staffName}`,
		buildBody: (payload) =>
			`${payload.staffName} was paid ${payload.amount}.${payload.actorName ? ` Recorded by ${payload.actorName}.` : ""}`,
		buildLink: (payload) => payload.link ?? "/staff/payroll",
		buildEmailTemplate: (payload) => ({
			subject: `${payload.schoolName}: payroll payment recorded`,
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
				title: `Payroll payment recorded`,
			}),
		}),
	}),
	payroll_payment_cancelled: defineNotification({
		channels: ["in_app", "email"],
		schema: payrollPaymentCancelledSchema,
		variant: "warning",
		buildTitle: (payload) => `Payroll payment cancelled for ${payload.staffName}`,
		buildBody: (payload) =>
			`${payload.staffName}'s payment worth ${payload.amount} was cancelled.${payload.actorName ? ` Cancelled by ${payload.actorName}.` : ""}`,
		buildLink: (payload) => payload.link ?? "/staff/payroll",
		buildEmailTemplate: (payload) => ({
			subject: `${payload.schoolName}: payroll payment cancelled`,
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
				title: `Payroll payment cancelled`,
			}),
		}),
	}),
} satisfies NotificationRegistry;

export type SchoolClerkNotificationType = keyof typeof schoolClerkNotificationTypes;

export function createNotificationFromType<
	TType extends SchoolClerkNotificationType,
>(
	type: TType,
	payload: unknown,
) {
	const definition = schoolClerkNotificationTypes[type] as AnyNotificationDefinition;
	const parsed = definition.schema.parse(payload);

	return {
		body: definition.buildBody(parsed),
		channels: definition.channels,
		emailTemplate: definition.buildEmailTemplate(parsed),
		link: definition.buildLink(parsed),
		title: definition.buildTitle(parsed),
		type,
		variant: definition.variant,
	};
}
