"use client";

import type { NotificationActionDescriptor } from "@school-clerk/notifications";

type StoredNotificationLike = {
	action?: unknown;
	id?: string | null;
	isRead?: boolean;
	link?: string | null;
};

function isHrefAction(
	action: StoredNotificationLike["action"],
): action is NotificationActionDescriptor & { kind: "href"; href: string } {
	return (
		!!action &&
		typeof action === "object" &&
		!Array.isArray(action) &&
		"kind" in action &&
		action.kind === "href" &&
		"href" in action &&
		typeof action.href === "string"
	);
}

export function resolveStoredNotificationAction(
	notification: StoredNotificationLike,
): (NotificationActionDescriptor & { kind: "href"; href: string }) | null {
	if (isHrefAction(notification.action)) {
		return notification.action;
	}

	if (notification.link) {
		return {
			actionId: notification.id ?? "notification-action",
			href: notification.link,
			kind: "href",
			label: "View",
		};
	}

	return null;
}
