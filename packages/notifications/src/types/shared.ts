import * as React from "react";
import { z } from "zod";
import {
	FinanceNotificationEmail,
	type FinanceNotificationEmailProps,
} from "@school-clerk/email/emails/finance-notification";
import type {
	NotificationActionDescriptor,
	NotificationChannel,
	NotificationVariant,
} from "../core-types";
import type { NotificationTypeDefinition } from "../notification-types";

export type NotificationEmailTemplate = {
	content: React.ReactElement;
	subject: string;
};

export type SchoolClerkNotificationDefinition<
	TSchema extends z.ZodTypeAny = z.ZodTypeAny,
> = NotificationTypeDefinition<TSchema> & {
	buildAction?: (
		payload: z.infer<TSchema>,
	) => NotificationActionDescriptor | null;
	buildBody: (payload: z.infer<TSchema>) => string | null;
	buildEmailTemplate: (
		payload: z.infer<TSchema>,
	) => NotificationEmailTemplate | null;
	buildLink: (payload: z.infer<TSchema>) => string | null;
};

export const currencySchema = z.string().min(1);

export const financeBaseSchema = z.object({
	actorName: z.string().optional().nullable(),
	amount: currencySchema,
	link: z.string().optional().nullable(),
	schoolName: z.string().min(1),
});

export function createFinanceTemplate(props: FinanceNotificationEmailProps) {
	return React.createElement(FinanceNotificationEmail, props);
}

export function defineSchoolNotification<TSchema extends z.ZodTypeAny>(input: {
	buildAction?: (
		payload: z.infer<TSchema>,
	) => NotificationActionDescriptor | null;
	buildBody: (payload: z.infer<TSchema>) => string | null;
	buildEmailTemplate: (
		payload: z.infer<TSchema>,
	) => NotificationEmailTemplate | null;
	buildLink: (payload: z.infer<TSchema>) => string | null;
	channels: NotificationChannel[];
	schema: TSchema;
	title: (payload: z.infer<TSchema>) => string;
	variant: NotificationVariant;
}): SchoolClerkNotificationDefinition<TSchema> {
	return {
		buildAction: input.buildAction,
		buildBody: input.buildBody,
		buildEmailTemplate: input.buildEmailTemplate,
		buildLink: input.buildLink,
		defaultAction: input.buildAction,
		defaultChannels: input.channels,
		description: input.buildBody,
		schema: input.schema,
		title: input.title,
		variant: input.variant,
	};
}
