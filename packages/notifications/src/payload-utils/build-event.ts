import {
	createNotificationDispatchFromType,
	type NotificationTypeRegistry,
} from "../notification-types";
import { schoolClerkNotificationTypes } from "../types/registry";
import { resolveNotificationAuthor } from "./author";
import type {
	NotificationEvent,
	NotificationTriggerInput,
	SchoolClerkNotificationType,
} from "./types";

export function buildNotificationEvent<TType extends SchoolClerkNotificationType>(
	type: TType,
	input: NotificationTriggerInput<TType>,
	authUserId?: string | null,
	registry: NotificationTypeRegistry = schoolClerkNotificationTypes,
): NotificationEvent<TType> {
	const author = resolveNotificationAuthor({
		author: input.author,
		authUserId,
	});

	createNotificationDispatchFromType(registry, type, input.payload, {
		channels: input.channels,
		recipients: input.recipients ?? [],
	});

	return {
		author,
		channels: input.channels,
		payload: input.payload,
		recipients: input.recipients ?? null,
		type,
	};
}
