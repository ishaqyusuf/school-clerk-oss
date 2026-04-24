import type { NotificationContact } from "./contacts";
import type {
	NotificationChannel,
	NotificationDeliveryPlan,
	NotificationDispatch,
} from "./core-types";

function supportsChannel(
	contact: NotificationContact,
	channel: NotificationChannel,
) {
	if (channel === "email") {
		return Boolean(contact.email);
	}

	if (channel === "whatsapp") {
		return Boolean(contact.phoneNumber);
	}

	return contact.kind === "user";
}

export function planNotificationDeliveries(
	notification: NotificationDispatch,
): NotificationDeliveryPlan {
	const dispatches: NotificationDeliveryPlan["dispatches"] = [];
	const skippedChannels: NotificationDeliveryPlan["skippedChannels"] = [];

	for (const channel of notification.channels) {
		const recipients = notification.recipients.filter((contact) =>
			supportsChannel(contact, channel),
		);

		if (recipients.length === 0) {
			skippedChannels.push({
				channel,
				reason:
					channel === "whatsapp"
						? "No recipients had a phone number for WhatsApp delivery."
						: channel === "email"
							? "No recipients had an email address for email delivery."
							: "No user recipients were available for in-app delivery.",
			});
			continue;
		}

		dispatches.push({
			action: notification.action,
			channel,
			description: notification.description,
			notificationType: notification.notificationType,
			payload: notification.payload,
			recipients,
			title: notification.title,
			variant: notification.variant ?? "info",
		});
	}

	return {
		dispatches,
		skippedChannels,
	};
}
