"use client";

import { switchSessionTerm } from "@/actions/cookies/auth-cookie";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { DropdownMenu } from "@school-clerk/ui/composite";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { Fragment } from "react";
import { _trpc } from "../static-trpc";
import {
	buildTermSwitcherModel,
	getVisibleTermGroups,
	parseTermSwitcherSessions,
} from "./term-switcher-model";

export function TermSwitcher({
	display = "header",
	fallbackTermTitle,
}: {
	display?: "header" | "dashboard";
	fallbackTermTitle?: string;
}) {
	const { data: dashboardData } = useQuery(
		_trpc.academics.dashboard.queryOptions({}),
	);
	const auth = useAuth();
	const sessions = parseTermSwitcherSessions(dashboardData?.sessions ?? []);
	const { currentSession, currentTerm, groups } = buildTermSwitcherModel(
		sessions,
		auth.profile?.sessionId,
		auth.profile?.termId,
	);
	const isAdmin = auth.role === "ADMIN" || auth.role === "Admin";
	const visibleGroups = getVisibleTermGroups(
		groups,
		isAdmin,
		currentSession?.id,
	);
	const currentTermTitle =
		currentTerm?.title ??
		fallbackTermTitle ??
		auth.profile?.termTitle ??
		"Select";
	const currentSessionTitle =
		currentSession?.name ?? auth.profile?.sessionTitle ?? "Session";
	const currentSelectionLabel = `${currentSessionTitle} · ${currentTermTitle}`;

	return (
		<DropdownMenu>
			<DropdownMenu.Trigger asChild>
				{display === "dashboard" ? (
					<Button
						variant="link"
						className="h-auto min-h-11 max-w-full gap-1 px-0 py-1 text-sm font-medium text-foreground underline-offset-4"
						aria-label={`Switch current academic term. Currently ${currentSelectionLabel}`}
					>
						<span className="truncate">{currentSelectionLabel}</span>
						<ChevronDown className="h-3.5 w-3.5 shrink-0" />
					</Button>
				) : (
					<Button
						variant="outline"
						aria-label={`Switch current academic term. Currently ${currentSelectionLabel}`}
						className="h-auto min-h-10 w-full max-w-[260px] justify-between gap-2 rounded-md border-border/70 bg-background/40 px-2.5 py-1.5 text-left shadow-none hover:bg-muted/50 md:w-[240px]"
					>
						<div className="flex min-w-0 flex-col">
							<span className="truncate text-[11px] font-medium leading-tight text-muted-foreground">
								{currentSessionTitle}
							</span>
							<span className="truncate text-sm font-semibold leading-tight text-foreground">
								{currentTermTitle}
							</span>
						</div>
						<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
					</Button>
				)}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				align="end"
				className="w-[min(92vw,22rem)] rounded-lg p-1.5"
			>
				{visibleGroups.length ? (
					visibleGroups.map((session, sessionIndex) => (
						<Fragment key={session.id}>
							{sessionIndex > 0 ? <DropdownMenu.Separator /> : null}
							<DropdownMenu.Group>
								<div className="flex items-center justify-between px-2 py-1">
									<DropdownMenu.Label className="px-0 py-0 text-xs font-semibold">
										{session.name}
									</DropdownMenu.Label>
									<Badge
										variant={
											session.id === currentSession?.id ? "default" : "outline"
										}
										className="h-5 rounded px-1.5 text-[10px] capitalize"
									>
										{session.status}
									</Badge>
								</div>
								<div className="space-y-0.5 pb-1">
									{session.terms.length ? (
										session.terms.map((term) => {
											const isActive = term.id === auth.profile?.termId;
											return (
												<DropdownMenu.Item
													key={term.id}
													className={cn(
														"flex items-center justify-between rounded-md px-2 py-2",
														isActive &&
															"bg-primary/5 text-primary focus:bg-primary/10",
													)}
													onSelect={() => {
														switchSessionTerm({
															termId: term.id,
															sessionId: session.id,
															termTitle: term.title,
															sessionTitle: session.name,
														}).then(() => {
															window.location.reload();
														});
													}}
												>
													<div className="flex min-w-0 flex-col">
														<span className="text-sm font-medium">
															{term.title}
														</span>
														<span className="text-[11px] capitalize text-muted-foreground">
															{term.status}
														</span>
													</div>
													{isActive ? (
														<Check className="h-3.5 w-3.5 shrink-0" />
													) : null}
												</DropdownMenu.Item>
											);
										})
									) : (
										<p className="px-2 py-2 text-xs text-muted-foreground">
											No scheduled terms.
										</p>
									)}
								</div>
							</DropdownMenu.Group>
						</Fragment>
					))
				) : (
					<p className="px-2 py-3 text-sm text-muted-foreground">
						No scheduled terms are available.
					</p>
				)}
			</DropdownMenu.Content>
		</DropdownMenu>
	);
}
