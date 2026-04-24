"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { resolveStoredNotificationAction } from "./notification-action";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@school-clerk/ui/popover";

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
	const trpc = useTRPC();
	const qc = useQueryClient();
	const router = useRouter();

	const { data: unreadCount = 0 } = useQuery(
		trpc.notifications.unreadCount.queryOptions(),
	);
	const { data: notifications = [] } = useQuery(
		trpc.notifications.list.queryOptions({ take: 5, onlyUnread: false }),
	);

	const invalidate = () => {
		qc.invalidateQueries({
			queryKey: trpc.notifications.unreadCount.queryKey(),
		});
		qc.invalidateQueries({
			queryKey: trpc.notifications.list.queryKey({ take: 5, onlyUnread: false }),
		});
		qc.invalidateQueries({
			queryKey: trpc.notifications.list.queryKey({ take: 100, onlyUnread: false }),
		});
		qc.invalidateQueries({
			queryKey: trpc.notifications.list.queryKey({ take: 100, onlyUnread: true }),
		});
	};

	const { mutate: markRead } = useMutation(
		trpc.notifications.markRead.mutationOptions({
			onSuccess: invalidate,
		}),
	);

	const { mutate: markAllRead, isPending: markAllPending } = useMutation(
		trpc.notifications.markAllRead.mutationOptions({
			onSuccess: invalidate,
		}),
	);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-4 w-4" />
					{unreadCount > 0 ? (
						<span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
							{unreadCount > 9 ? "9+" : unreadCount}
						</span>
					) : null}
					<span className="sr-only">Notifications</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 p-0">
				<div className="flex items-center justify-between border-b px-4 py-3">
					<p className="text-sm font-semibold">Notifications</p>
					<div className="flex items-center gap-2">
						{unreadCount > 0 ? (
							<Badge variant="secondary" className="text-xs">
								{unreadCount} unread
							</Badge>
						) : null}
						{unreadCount > 0 ? (
							<Button
								variant="ghost"
								size="xs"
								type="button"
								disabled={markAllPending}
								onClick={() => markAllRead()}
							>
								Mark all read
							</Button>
						) : null}
					</div>
				</div>

				<div className="max-h-80 overflow-y-auto">
					{notifications.length === 0 ? (
						<div className="px-4 py-10 text-center">
							<Bell className="mx-auto h-6 w-6 text-muted-foreground/50" />
							<p className="mt-2 text-xs text-muted-foreground">
								No notifications yet
							</p>
						</div>
					) : (
						<div className="divide-y divide-border">
							{notifications.map((notification) => (
								<button
									key={notification.id}
									type="button"
									className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
										notification.isRead ? "" : "bg-primary/5"
									}`}
									onClick={() => {
										if (!notification.isRead) {
											markRead({ notificationId: notification.id });
										}
										const action = resolveStoredNotificationAction(notification);
										router.push(action?.href || "/notifications");
									}}
								>
									<div className="flex items-start justify-between gap-2">
										<p
											className={`text-sm leading-tight ${
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
										<p className="mt-1 text-xs text-muted-foreground line-clamp-2">
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
						className="w-full"
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
