"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent } from "@school-clerk/ui/card";
import { resolveStoredNotificationAction } from "./notification-action";

function formatDate(dateInput?: Date | string | null) {
	if (!dateInput) return "";

	return new Intl.DateTimeFormat("en-NG", {
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(dateInput));
}

export function NotificationsPageClient() {
	const trpc = useTRPC();
	const qc = useQueryClient();
	const router = useRouter();
	const searchParams = useSearchParams();
	const onlyUnread = searchParams.get("filter") === "unread";

	const { data: notifications = [] } = useQuery(
		trpc.notifications.list.queryOptions({
			onlyUnread,
			take: 100,
		}),
	);

	const unreadCount = notifications.filter((notification) => !notification.isRead).length;

	const invalidate = () => {
		qc.invalidateQueries({
			queryKey: trpc.notifications.unreadCount.queryKey(),
		});
		qc.invalidateQueries({
			queryKey: trpc.notifications.list.queryKey({
				onlyUnread: false,
				take: 100,
			}),
		});
		qc.invalidateQueries({
			queryKey: trpc.notifications.list.queryKey({
				onlyUnread: true,
				take: 100,
			}),
		});
		qc.invalidateQueries({
			queryKey: trpc.notifications.list.queryKey({
				onlyUnread: false,
				take: 5,
			}),
		});
	};

	const { mutate: markAllRead, isPending } = useMutation(
		trpc.notifications.markAllRead.mutationOptions({
			onSuccess: invalidate,
		}),
	);
	const { mutate: markRead } = useMutation(
		trpc.notifications.markRead.mutationOptions({
			onSuccess: invalidate,
		}),
	);

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<div className="mt-2 flex items-center gap-3">
						<h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
						{unreadCount > 0 ? <Badge>{unreadCount} unread</Badge> : null}
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						{notifications.length} notification
						{notifications.length === 1 ? "" : "s"}
					</p>
				</div>

				<div className="flex items-center gap-2">
					{unreadCount > 0 ? (
						<Button
							variant="outline"
							size="sm"
							type="button"
							disabled={isPending}
							onClick={() => markAllRead()}
						>
							<CheckCheck className="mr-2 h-4 w-4" />
							Mark all read
						</Button>
					) : null}
					<div className="flex items-center gap-1 rounded-md border border-input text-sm">
						<Link
							href="/notifications"
							className={`rounded-l-md px-3 py-1.5 transition-colors ${
								onlyUnread
									? "text-muted-foreground hover:text-foreground"
									: "bg-primary text-primary-foreground"
							}`}
						>
							All
						</Link>
						<Link
							href="/notifications?filter=unread"
							className={`rounded-r-md px-3 py-1.5 transition-colors ${
								onlyUnread
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							Unread
						</Link>
					</div>
				</div>
			</div>

			{notifications.length === 0 ? (
				<Card className="py-20 text-center">
					<CardContent className="flex flex-col items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
							<Bell className="h-6 w-6 text-muted-foreground" />
						</div>
						<p className="text-muted-foreground">
							{onlyUnread ? "No unread notifications." : "No notifications yet."}
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-2">
					{notifications.map((notification) => {
						const action = resolveStoredNotificationAction(notification);

						return (
							<Card
								key={notification.id}
								className={`transition-colors ${
									notification.isRead ? "" : "border-primary/40 bg-primary/5"
								}`}
							>
								<CardContent className="flex items-start gap-4 px-5 py-4">
									<div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
										<Bell className="h-4 w-4 text-muted-foreground" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-start justify-between gap-2">
											<p className="text-sm font-medium text-foreground">
												{notification.title}
											</p>
											{!notification.isRead ? (
												<span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
											) : null}
										</div>
										{notification.body ? (
											<p className="mt-1 text-sm text-muted-foreground">
												{notification.body}
											</p>
										) : null}
										<div className="mt-2 flex items-center gap-3">
											<p className="text-xs text-muted-foreground">
												{formatDate(notification.createdAt)}
											</p>
											<Badge variant="outline" className="text-xs capitalize">
												{notification.type.replace(/_/g, " ")}
											</Badge>
											{!notification.isRead ? (
												<Button
													variant="ghost"
													size="xs"
													type="button"
													onClick={() =>
														markRead({ notificationId: notification.id })
													}
												>
													Mark read
												</Button>
											) : null}
										</div>
										{action ? (
											<Button
												variant="link"
												size="sm"
												className="mt-2 h-auto p-0 text-xs"
												type="button"
												onClick={() => {
													if (!notification.isRead) {
														markRead({ notificationId: notification.id });
													}
													if (action.href) {
														router.push(action.href);
													}
												}}
											>
												{action.label || "View"} →
											</Button>
										) : null}
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
