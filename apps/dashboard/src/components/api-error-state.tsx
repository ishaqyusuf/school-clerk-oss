"use client";

import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import {
	AlertTriangle,
	ChevronRight,
	Lock,
	LogIn,
	RefreshCcw,
	SearchX,
	WifiOff,
} from "lucide-react";
import { useMemo } from "react";
import {
	type DashboardErrorKind,
	classifyDashboardError,
	readErrorMessage,
} from "./api-error-kind";

const COPY: Record<
	DashboardErrorKind,
	{ icon: typeof Lock; tone: string; title: string; description: string }
> = {
	forbidden: {
		icon: Lock,
		tone: "bg-muted text-muted-foreground",
		title: "You don’t have access to this page",
		description:
			"Your role can’t open this part of the dashboard. If you need it, ask a school admin to change your access.",
	},
	unauthorized: {
		icon: LogIn,
		tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
		title: "Your session has ended",
		description: "Sign in again to continue where you left off.",
	},
	not_found: {
		icon: SearchX,
		tone: "bg-muted text-muted-foreground",
		title: "We couldn’t find that",
		description:
			"It may have been removed, or the link is out of date.",
	},
	network: {
		icon: WifiOff,
		tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
		title: "Can’t reach School Clerk",
		description: "Check your connection, then try again.",
	},
	unknown: {
		icon: AlertTriangle,
		tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
		title: "Something went wrong",
		description:
			"This page didn’t finish loading. Try again — if it keeps happening, let your school admin know.",
	},
};

type ApiErrorStateProps = {
	error?: unknown;
	/** Overrides the classified title/description. */
	title?: string;
	description?: string;
	onRetry?: () => void;
	retryLabel?: string;
	/** Where "Go to your dashboard" leads (the viewer's first permitted page). */
	homeHref?: string;
};

export function ApiErrorState({
	error,
	title,
	description,
	onRetry,
	retryLabel = "Try again",
	homeHref = "/",
}: ApiErrorStateProps) {
	const kind = useMemo(() => classifyDashboardError(error), [error]);
	const message = useMemo(() => readErrorMessage(error), [error]);
	const copy = COPY[kind];
	const Icon = copy.icon;

	const primary =
		kind === "unauthorized" ? (
			<Button asChild className="min-h-11 md:min-h-9">
				<Link href="/signout">
					<LogIn className="mr-2 size-4" />
					Sign in again
				</Link>
			</Button>
		) : kind === "forbidden" || kind === "not_found" ? (
			<Button asChild className="min-h-11 md:min-h-9">
				<Link href={homeHref}>Go to your dashboard</Link>
			</Button>
		) : onRetry ? (
			<Button type="button" onClick={onRetry} className="min-h-11 md:min-h-9">
				<RefreshCcw className="mr-2 size-4" />
				{retryLabel}
			</Button>
		) : null;

	const secondary =
		(kind === "network" || kind === "unknown") && onRetry ? (
			<Button asChild variant="ghost" className="min-h-11 md:min-h-9">
				<Link href={homeHref}>Go to your dashboard</Link>
			</Button>
		) : kind === "not_found" && onRetry ? (
			<Button type="button" variant="ghost" onClick={onRetry} className="min-h-11 md:min-h-9">
				{retryLabel}
			</Button>
		) : null;

	return (
		<div
			role="alert"
			className="flex min-h-[50vh] items-center justify-center px-4 py-10"
		>
			<div className="w-full max-w-md text-center">
				<div
					className={cn(
						"mx-auto grid size-12 place-items-center rounded-full",
						copy.tone,
					)}
				>
					<Icon className="size-5" aria-hidden />
				</div>
				<h2 className="mt-4 text-lg font-semibold tracking-tight">
					{title ?? copy.title}
				</h2>
				<p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">
					{description ?? copy.description}
				</p>
				<div className="mt-5 flex flex-col-reverse justify-center gap-2 sm:flex-row">
					{secondary}
					{primary}
				</div>
				{message && kind !== "forbidden" ? (
					<details className="group mx-auto mt-6 max-w-sm text-left text-xs text-muted-foreground">
						<summary className="flex cursor-pointer list-none items-center justify-center gap-1 hover:text-foreground">
							<ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
							Technical details
						</summary>
						<p className="mt-2 break-words rounded-md border bg-muted/40 p-3 font-mono">
							{message}
						</p>
					</details>
				) : null}
			</div>
		</div>
	);
}
