"use client";

import { useNotificationFeed, useNotificationReadActions, useNotificationUnreadCount } from "@/hooks/use-notifications";
import { useTenantRouter as useRouter } from "@school-clerk/tenant-url/next";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@school-clerk/ui/popover";
import { Bell } from "lucide-react";
import { resolveStoredNotificationAction } from "./notification-action";

function formatRelativeTime(dateInput?: Date | string | null) {
	if (!dateInput) return "";

	const date = new Date(dateInput);
	const diffMs = Date.now() - date.getTime();
	const diffMinutes = Math.floor(diffMs / 60000);

	if (diffMinutes < 1) return "just now";
	if (diffMinutes < 60) return `${diffMinutes}m ago`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours}h ago`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;

	return date.toLocaleDateString("en-NG", {
		day: "numeric",
		month: "short",
	});
}

export function NotificationBell() {
	const router = useRouter();
	const { unreadCount, isError: countError } = useNotificationUnreadCount();
	const { notifications, isPending: feedPending, isError: feedError, refetch } = useNotificationFeed(5, false);
	const { markRead, markAllRead, markReadPending, markAllPending, markReadError, markAllError } = useNotificationReadActions();

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative size-11 md:size-9"
				>
					<Bell className="h-4 w-4" />
					{!countError && !feedError && unreadCount > 0 ? (
						<span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
							{unreadCount > 9 ? "9+" : unreadCount}
						</span>
					) : null}
					<span className="sr-only">Notifications</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
				<div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
					<p className="text-sm font-semibold">Notifications</p>
					<div className="flex flex-wrap items-center gap-2">
						{!countError && !feedError && unreadCount > 0 ? (
							<Badge variant="secondary" className="text-xs">
								{unreadCount} unread
							</Badge>
						) : null}
						{!countError && !feedError && unreadCount > 0 ? (
							<Button
								variant="ghost"
								size="xs"
								type="button"
								className="min-h-11"
								disabled={markAllPending || markReadPending}
								onClick={() => markAllRead()}
							>
								{markAllPending ? "Marking…" : "Mark available read"}
							</Button>
						) : null}
					</div>
				</div>
				<p className="px-4 py-2 text-xs text-muted-foreground">
					Showing notifications available with your current access.
				</p>
				{markAllError || markReadError ? (
					<p role="alert" className="px-4 py-2 text-xs text-destructive">
						Could not update read status. Refresh notifications before trying again.
					</p>
				) : null}

				<div className="max-h-80 overflow-y-auto">
					{feedError ? (
						<div role="alert" className="px-4 py-3 text-sm">
							<p>Notifications could not be loaded. Your access may have changed.</p>
							<Button type="button" variant="outline" className="mt-2 min-h-11" onClick={() => void refetch()}>
								Refresh
							</Button>
						</div>
					) : feedPending ? (
						<p role="status" className="px-4 py-3 text-sm text-muted-foreground">Loading notifications…</p>
					) : notifications.length === 0 ? (
						<div className="px-4 py-10 text-center">
							<Bell className="mx-auto h-6 w-6 text-muted-foreground/50" />
							<p className="mt-2 text-xs text-muted-foreground">
								No notifications available with your current access
							</p>
						</div>
					) : (
						<div className="divide-y divide-border">
							{notifications.map((notification) => (
								<button
									key={notification.id}
									type="button"
									className={`min-h-11 w-full px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
										notification.isRead ? "" : "bg-primary/5"
									}`}
									onClick={() => {
										if (!notification.isRead) {
											markRead({ notificationId: notification.id });
										}
										const action =
											resolveStoredNotificationAction(notification);
										router.push(action?.href || "/notifications");
									}}
								>
									<div className="flex items-start justify-between gap-2">
										<p
											className={`min-w-0 break-words text-sm leading-tight ${
												notification.isRead ? "font-medium" : "font-semibold"
											}`}
										>
											{notification.title}
										</p>
										<span className="shrink-0 text-[10px] text-muted-foreground">
											{formatRelativeTime(notification.createdAt)}
										</span>
									</div>
									{notification.body ? (
										<p className="mt-1 break-words text-xs text-muted-foreground line-clamp-2">
											{notification.body}
										</p>
									) : null}
								</button>
							))}
						</div>
					)}
				</div>

				<div className="border-t px-4 py-2">
					<Button
						variant="ghost"
						size="sm"
						className="min-h-11 w-full"
						type="button"
						onClick={() => router.push("/notifications")}
					>
						View all notifications
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
