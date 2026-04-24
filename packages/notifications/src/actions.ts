import type { NotificationActionDescriptor } from "./core-types";

export function createHrefNotificationAction(input: {
	href: string;
	label: string;
}): NotificationActionDescriptor {
	return {
		href: input.href,
		kind: "href",
		label: input.label,
	};
}

export const notificationActions = {
	href: createHrefNotificationAction,
};
