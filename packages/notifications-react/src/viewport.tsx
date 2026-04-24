"use client";

import type { NotificationRecord } from "@school-clerk/notifications";
import { cn } from "@school-clerk/ui/cn";

const accentClasses = {
	error: "border-rose-200 bg-rose-50 text-rose-950",
	info: "border-sky-200 bg-sky-50 text-sky-950",
	success: "border-emerald-200 bg-emerald-50 text-emerald-950",
	warning: "border-amber-200 bg-amber-50 text-amber-950",
};

export function NotificationsViewport({
	notifications,
	onAction,
	onDismiss,
}: {
	notifications: NotificationRecord[];
	onAction: (actionId: string) => void;
	onDismiss: (notificationId: string) => void;
}) {
	if (notifications.length === 0) {
		return null;
	}

	return (
		<div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-end p-4 sm:p-6">
			<div className="flex w-full max-w-sm flex-col gap-3">
				{notifications.map((notification) => (
					<div
						aria-live="polite"
						className={cn(
							"pointer-events-auto rounded-[var(--radius-lg)] border shadow-[var(--shadow-card)] backdrop-blur",
							accentClasses[notification.variant],
						)}
						key={notification.id}
						role="status"
					>
						<div className="flex items-start gap-3 px-4 py-4">
							<div className="min-w-0 flex-1">
								<p className="text-sm font-semibold">{notification.title}</p>
								{notification.description ? (
									<p className="mt-1 text-sm leading-6 opacity-90">
										{notification.description}
									</p>
								) : null}
								{notification.recipients.length > 0 ? (
									<p className="mt-2 text-xs uppercase tracking-[0.2em] opacity-70">
										{notification.recipients
											.map(
												(recipient) => recipient.displayName ?? recipient.kind,
											)
											.join(", ")}
									</p>
								) : null}
								<div className="mt-3 flex items-center gap-3">
									{notification.action ? (
										<button
											className="rounded-full border border-current px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
											onClick={() =>
												onAction(notification.action?.actionId ?? "")
											}
											type="button"
										>
											{notification.action.label}
										</button>
									) : null}
									<button
										className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80"
										onClick={() => onDismiss(notification.id)}
										type="button"
									>
										Dismiss
									</button>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
