"use client";

import type { NotificationActionDescriptor } from "@school-clerk/notifications";

type StoredNotificationLike = {
	action?: NotificationActionDescriptor | null;
	id: string;
	isRead?: boolean;
	link?: string | null;
};

export function resolveStoredNotificationAction(
	notification: StoredNotificationLike,
): NotificationActionDescriptor | null {
	if (notification.action?.kind === "href" && notification.action.href) {
		return notification.action;
	}

	if (notification.link) {
		return {
			actionId: notification.id,
			href: notification.link,
			kind: "href",
			label: "View",
		};
	}

	return null;
}
