"use client";

import { useNotificationFeed, useNotificationReadActions } from "@/hooks/use-notifications";
import { Bell, CheckCheck } from "lucide-react";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { useSearchParams } from "next/navigation";
import { useTenantRouter as useRouter } from "@school-clerk/tenant-url/next";
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
	const router = useRouter();
	const searchParams = useSearchParams();
	const onlyUnread = searchParams.get("filter") === "unread";

	const { notifications, isPending: feedPending, isError: feedError, refetch } = useNotificationFeed(100, onlyUnread);
	const unreadCount = notifications.filter((notification) => !notification.isRead).length;
	const { markRead, markAllRead, markReadPending, markAllPending: isPending, markReadError, markAllError } = useNotificationReadActions();

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0">
					<div className="mt-2 flex flex-wrap items-center gap-3">
						<h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
						{!feedError && unreadCount > 0 ? <Badge>{unreadCount} unread in this list</Badge> : null}
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						Notifications available with your current access. Older or unavailable
						module notifications may be hidden.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{!feedError && unreadCount > 0 ? (
						<Button
							variant="outline"
							size="sm"
							type="button"
							className="min-h-11"
							disabled={isPending || markReadPending}
							onClick={() => markAllRead()}
						>
							<CheckCheck className="mr-2 h-4 w-4" />
							{isPending ? "Marking…" : "Mark available read"}
						</Button>
					) : null}
					<div className="flex items-center gap-1 rounded-md border border-input text-sm">
						<Link
							href="/notifications"
							aria-current={!onlyUnread ? "page" : undefined}
							className={`inline-flex min-h-11 items-center rounded-l-md px-3 py-1.5 transition-colors ${
								onlyUnread
									? "text-muted-foreground hover:text-foreground"
									: "bg-primary text-primary-foreground"
							}`}
						>
							All
						</Link>
						<Link
							href="/notifications?filter=unread"
							aria-current={onlyUnread ? "page" : undefined}
							className={`inline-flex min-h-11 items-center rounded-r-md px-3 py-1.5 transition-colors ${
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

			{markAllError || markReadError ? (
				<p role="alert" className="text-sm text-destructive">
					Could not update read status. Refresh the list before trying again.
				</p>
			) : null}
			{feedError ? (
				<div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
					<p>Notifications could not be loaded. Your access may have changed.</p>
					<Button type="button" variant="outline" className="min-h-11" onClick={() => void refetch()}>
						Refresh
					</Button>
				</div>
			) : feedPending ? (
				<p role="status" className="text-sm text-muted-foreground">Loading notifications…</p>
			) : notifications.length === 0 ? (
				<Card className="py-20 text-center">
					<CardContent className="flex flex-col items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
							<Bell className="h-6 w-6 text-muted-foreground" />
						</div>
						<p className="text-muted-foreground">
							{onlyUnread ? "No unread notifications available with your current access." : "No notifications available with your current access."}
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
											<p className="min-w-0 break-words text-sm font-medium text-foreground">
												{notification.title}
											</p>
											{!notification.isRead ? (
												<span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
											) : null}
										</div>
										{notification.body ? (
											<p className="mt-1 break-words text-sm text-muted-foreground">
												{notification.body}
											</p>
										) : null}
										<div className="mt-2 flex flex-wrap items-center gap-3">
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
													className="min-h-11"
													disabled={isPending || markReadPending}
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
												className="mt-2 h-auto min-h-11 max-w-full whitespace-normal break-words p-0 text-left text-xs"
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
