import type { NotificationChannel } from "./core-types";

function uniqueChannels(channels: NotificationChannel[]) {
	return Array.from(new Set(channels));
}

export function inAppChannel(): NotificationChannel[] {
	return ["in_app"];
}

export function emailChannel(): NotificationChannel[] {
	return ["email"];
}

export function whatsappChannel(): NotificationChannel[] {
	return ["whatsapp"];
}

export function inAppAndEmailChannels(): NotificationChannel[] {
	return ["in_app", "email"];
}

export function allNotificationChannels(): NotificationChannel[] {
	return ["in_app", "email", "whatsapp"];
}

export function notificationChannels(
	...channels: NotificationChannel[]
): NotificationChannel[] {
	return uniqueChannels(channels);
}

export const channelHelpers = {
	all: allNotificationChannels,
	email: emailChannel,
	inApp: inAppChannel,
	inAppAndEmail: inAppAndEmailChannels,
	only: notificationChannels,
	whatsapp: whatsappChannel,
};
