import {
	createNotificationChannelTriggers,
	type NotificationTriggerInput,
	type SchoolClerkNotificationType,
} from "./payload-utils";
import type {
	NotificationActionDescriptor,
	NotificationChannel,
	NotificationVariant,
} from "./core-types";
import {
	schoolClerkNotificationTypes,
	type NotificationEmailTemplate,
	type SchoolClerkNotificationDefinition,
} from "./types/registry";

export * from "./contacts";
export * from "./core-types";
export * from "./actions";
export * from "./channels";
export * from "./delivery";
export * from "./memory-store";
export * from "./notification-types";
export * from "./payload-utils/index";
export * from "./services/email-service";
export * from "./services/triggers";
export * from "./services/whatsapp-service";
export * from "./store";
export * from "./types/registry";

export type SchoolClerkNotification = {
	action?: NotificationActionDescriptor;
	body: string | null;
	channels: NotificationChannel[];
	emailTemplate: NotificationEmailTemplate | null;
	link: string | null;
	title: string;
	type: SchoolClerkNotificationType;
	variant: NotificationVariant;
};

export { schoolClerkNotificationTypes };

export type SchoolClerkNotificationTypeKey = keyof typeof schoolClerkNotificationTypes;

export function createNotificationFromType<
	TType extends SchoolClerkNotificationType,
>(type: TType, payload: unknown): SchoolClerkNotification {
	const definition = schoolClerkNotificationTypes[
		type
	] as SchoolClerkNotificationDefinition;

	if (!definition) {
		throw new Error(`Unknown notification type: ${type}`);
	}

	const parsed = definition.schema.parse(payload);
	const title =
		typeof definition.title === "function"
			? definition.title(parsed)
			: definition.title;
	const variant =
		typeof definition.variant === "function"
			? definition.variant(parsed)
			: definition.variant;

	return {
		action: definition.buildAction?.(parsed) ?? undefined,
		body: definition.buildBody(parsed),
		channels: definition.defaultChannels ?? ["in_app"],
		emailTemplate: definition.buildEmailTemplate(parsed),
		link: definition.buildLink(parsed),
		title: title ?? "Notification",
		type,
		variant: variant ?? "info",
	};
}

export const notify = (
	send: <TType extends SchoolClerkNotificationType>(
		type: TType,
		input: NotificationTriggerInput<TType>,
	) => unknown | Promise<unknown>,
) => {
	return createNotificationChannelTriggers({
		getStoredRecipients: () => null,
		send,
	});
};
