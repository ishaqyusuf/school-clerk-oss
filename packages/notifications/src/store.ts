import type { NotificationInput, NotificationState } from "./core-types";

export type NotificationListener = () => void;

export type NotificationStore = {
	clear: () => void;
	dismiss: (notificationId: string) => void;
	getState: () => NotificationState;
	publish: (input: NotificationInput) => string;
	remove: (notificationId: string) => void;
	subscribe: (listener: NotificationListener) => () => void;
};
