import {
	createSubscriberNotificationContact,
	createUserNotificationContact,
	type NotificationContact,
} from "../contacts";
import type { NotificationRecipients } from "./types";

function dedupeRecipients(recipients: NotificationContact[]) {
	const seen = new Set<string>();

	return recipients.filter((recipient) => {
		const key =
			recipient.kind === "user"
				? `user:${recipient.userId}`
				: `subscriber:${recipient.subscriberId}`;

		if (seen.has(key)) {
			return false;
		}

		seen.add(key);
		return true;
	});
}

export function makeUserRecipients(
	...recipients: Array<Parameters<typeof createUserNotificationContact>[0]>
) {
	return recipients.map((recipient) => createUserNotificationContact(recipient));
}

export function makeSubscriberRecipients(
	...recipients: Array<Parameters<typeof createSubscriberNotificationContact>[0]>
) {
	return recipients.map((recipient) =>
		createSubscriberNotificationContact(recipient),
	);
}

export function normalizeRecipients(recipients?: NotificationRecipients) {
	if (!recipients?.length) {
		return null;
	}

	return dedupeRecipients(recipients);
}
