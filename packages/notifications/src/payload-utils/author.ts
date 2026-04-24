import type { NotificationAuthor } from "./types";

export const SYSTEM_NOTIFICATION_AUTHOR_ID = "system";

export function resolveNotificationAuthor(input: {
	author?: NotificationAuthor;
	authUserId?: string | null;
}) {
	const explicitAuthor = input.author;

	if (explicitAuthor?.id) {
		return explicitAuthor;
	}

	if (input.authUserId?.trim()) {
		return {
			id: input.authUserId.trim(),
		};
	}

	return {
		id: SYSTEM_NOTIFICATION_AUTHOR_ID,
	};
}
