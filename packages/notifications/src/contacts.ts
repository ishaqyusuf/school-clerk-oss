export type NotificationContactKind = "subscriber" | "user";

type BaseNotificationContact = {
	displayName?: string;
	email?: string;
	kind: NotificationContactKind;
	phoneNumber?: string;
};

export type NotificationUserContact = BaseNotificationContact & {
	kind: "user";
	userId: string;
};

export type NotificationSubscriberContact = BaseNotificationContact & {
	kind: "subscriber";
	subscriberId: string;
	topic?: string;
};

export type NotificationContact =
	| NotificationSubscriberContact
	| NotificationUserContact;

export function createUserNotificationContact(
	contact: Omit<NotificationUserContact, "kind">,
): NotificationUserContact {
	return {
		...contact,
		kind: "user",
	};
}

export function createSubscriberNotificationContact(
	contact: Omit<NotificationSubscriberContact, "kind">,
): NotificationSubscriberContact {
	return {
		...contact,
		kind: "subscriber",
	};
}

export function isNotificationContactKind(
	contact: NotificationContact,
	kind: NotificationContactKind,
) {
	return contact.kind === kind;
}
