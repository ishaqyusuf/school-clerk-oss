import type { NotificationContact } from "./contacts";

export type NotificationChannel = "email" | "in_app" | "whatsapp";

export type NotificationVariant = "info" | "success" | "warning" | "error";

export type NotificationStatus = "active" | "dismissed";

export type NotificationHrefActionDescriptor = {
	actionId?: string;
	href: string;
	kind: "href";
	label: string;
};

export type NotificationCallbackActionDescriptor = {
	actionId?: string;
	kind: "callback";
	label: string;
};

export type NotificationActionDescriptor =
	| NotificationCallbackActionDescriptor
	| NotificationHrefActionDescriptor;

export type NotificationRecord = {
	action?: NotificationActionDescriptor;
	channels: NotificationChannel[];
	createdAt: string;
	description?: string;
	durationMs?: number;
	id: string;
	notificationType: string;
	recipients: NotificationContact[];
	status: NotificationStatus;
	title: string;
	variant: NotificationVariant;
};

export type NotificationInput = {
	action?: NotificationActionDescriptor;
	channels?: NotificationChannel[];
	description?: string;
	durationMs?: number;
	id?: string;
	notificationType: string;
	recipients?: NotificationContact[];
	title: string;
	variant?: NotificationVariant;
};

export type NotificationDispatch = NotificationInput & {
	channels: NotificationChannel[];
	payload: unknown;
	recipients: NotificationContact[];
};

export type NotificationChannelDispatch = {
	action?: NotificationActionDescriptor;
	channel: NotificationChannel;
	description?: string;
	notificationType: string;
	payload: unknown;
	recipients: NotificationContact[];
	title: string;
	variant: NotificationVariant;
};

export type NotificationSkippedChannel = {
	channel: NotificationChannel;
	reason: string;
};

export type NotificationDeliveryPlan = {
	dispatches: NotificationChannelDispatch[];
	skippedChannels: NotificationSkippedChannel[];
};

export type NotificationState = {
	notifications: NotificationRecord[];
};
