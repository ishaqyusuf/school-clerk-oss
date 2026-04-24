"use client";

import {
	createMemoryNotificationStore,
	createNotificationInputFromType,
	NotificationService,
	type NotificationInput,
	type NotificationRecord,
	type NotificationStore,
	type NotificationVariant,
	schoolClerkNotificationTypes,
} from "@school-clerk/notifications";
import {
	createContext,
	type ReactNode,
	use,
	useEffect,
	useRef,
	useSyncExternalStore,
} from "react";
import { NotificationsViewport } from "./viewport";

type NotificationActionInput = {
	label: string;
	onClick: () => void;
};

export type NotifyInput = Omit<NotificationInput, "action"> & {
	action?: NotificationActionInput;
};

type VariantNotifyInput = Omit<NotifyInput, "notificationType"> & {
	notificationType?: string;
};

type NotificationsContextValue = {
	clear: () => void;
	dismiss: (notificationId: string) => void;
	notifications: NotificationRecord[];
	notify: (input: NotifyInput) => string;
	service: NotificationService;
	showError: (
		title: string,
		input?: Omit<VariantNotifyInput, "title" | "variant">,
	) => string;
	showInfo: (
		title: string,
		input?: Omit<VariantNotifyInput, "title" | "variant">,
	) => string;
	showSuccess: (
		title: string,
		input?: Omit<VariantNotifyInput, "title" | "variant">,
	) => string;
	showWarning: (
		title: string,
		input?: Omit<VariantNotifyInput, "title" | "variant">,
	) => string;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
	null,
);

function useNotificationStore(store: NotificationStore) {
	return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function NotificationsProvider({
	children,
	store,
}: {
	children: ReactNode;
	store?: NotificationStore;
}) {
	const storeRef = useRef<NotificationStore>(
		store ?? createMemoryNotificationStore(),
	);
	const actionHandlersRef = useRef(new Map<string, () => void>());
	const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
	const serviceRef = useRef<NotificationService | null>(null);
	const state = useNotificationStore(storeRef.current);

	useEffect(() => {
		for (const notification of state.notifications) {
			if (
				notification.status !== "active" ||
				notification.durationMs === undefined ||
				timersRef.current.has(notification.id)
			) {
				continue;
			}

			const timer = setTimeout(() => {
				storeRef.current.dismiss(notification.id);
			}, notification.durationMs);

			timersRef.current.set(notification.id, timer);
		}

		for (const notification of state.notifications) {
			if (notification.status === "dismissed") {
				const timer = timersRef.current.get(notification.id);

				if (timer) {
					clearTimeout(timer);
					timersRef.current.delete(notification.id);
				}

				actionHandlersRef.current.delete(notification.id);
			}
		}
	}, [state.notifications]);

	useEffect(() => {
		return () => {
			for (const timer of timersRef.current.values()) {
				clearTimeout(timer);
			}
			timersRef.current.clear();
		};
	}, []);

	function notifyWithVariant(
		variant: NotificationVariant,
		title: string,
		input?: Omit<VariantNotifyInput, "title" | "variant">,
	) {
		return notify({
			...input,
			notificationType: input?.notificationType ?? "app_notification",
			title,
			variant,
		});
	}

	function notify(input: NotifyInput) {
		const notificationId =
			input.id ?? `react-notification-${Date.now()}-${Math.random()}`;

		if (input.action) {
			actionHandlersRef.current.set(notificationId, input.action.onClick);
		}

		return storeRef.current.publish({
			...input,
			action: input.action
				? {
						actionId: notificationId,
						label: input.action.label,
					}
				: undefined,
			id: notificationId,
		});
	}

	if (!serviceRef.current) {
		serviceRef.current = new NotificationService((type, input) => {
			return notify(
				createNotificationInputFromType(
					schoolClerkNotificationTypes,
					type,
					input.payload as never,
					{
						channels: input.channels,
						recipients: input.recipients ?? [],
					},
				),
			);
		});
	}

	const value: NotificationsContextValue = {
		clear() {
			actionHandlersRef.current.clear();
			storeRef.current.clear();
		},
		dismiss(notificationId) {
			actionHandlersRef.current.delete(notificationId);
			storeRef.current.dismiss(notificationId);
		},
		notifications: state.notifications.filter(
			(notification) => notification.status === "active",
		),
		notify,
		service: serviceRef.current,
		showError(title, input) {
			return notifyWithVariant("error", title, input);
		},
		showInfo(title, input) {
			return notifyWithVariant("info", title, input);
		},
		showSuccess(title, input) {
			return notifyWithVariant("success", title, input);
		},
		showWarning(title, input) {
			return notifyWithVariant("warning", title, input);
		},
	};

	return (
		<NotificationsContext value={value}>
			{children}
			<NotificationsViewport
				notifications={value.notifications}
				onAction={(actionId) => {
					actionHandlersRef.current.get(actionId)?.();
				}}
				onDismiss={value.dismiss}
			/>
		</NotificationsContext>
	);
}

export function useNotifications() {
	const context = use(NotificationsContext);

	if (!context) {
		throw new Error(
			"useNotifications must be used within NotificationsProvider.",
		);
	}

	return context;
}
