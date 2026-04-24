import type { z } from "zod";
import type { NotificationContact } from "../contacts";
import type { NotificationChannel } from "../core-types";
import { schoolClerkNotificationTypes } from "../types/registry";

export type NotificationAuthor = {
	id: string;
};

export type NotificationRecipients = NotificationContact[] | null;

export type SchoolClerkNotificationType =
	| (keyof typeof schoolClerkNotificationTypes & string);

export type NotificationPayload<TType extends SchoolClerkNotificationType> = z.infer<
	(typeof schoolClerkNotificationTypes)[TType]["schema"]
>;

export type NotificationEvent<TType extends SchoolClerkNotificationType> = {
	author: NotificationAuthor;
	channels?: NotificationChannel[];
	payload: NotificationPayload<TType>;
	recipients: NotificationRecipients;
	type: TType;
};

export type NotificationTriggerInput<TType extends SchoolClerkNotificationType> =
	Omit<NotificationEvent<TType>, "author" | "recipients" | "type"> & {
		author?: NotificationAuthor;
		recipients?: NotificationRecipients;
	};
