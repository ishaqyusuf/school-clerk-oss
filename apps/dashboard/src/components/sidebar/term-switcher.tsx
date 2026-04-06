"use client";

import { switchSessionTerm } from "@/actions/cookies/auth-cookie";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { DropdownMenu } from "@school-clerk/ui/composite";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { _trpc } from "../static-trpc";

export function TermSwitcher() {
	const { data: dashboardData } = useQuery(
		_trpc.academics.dashboard.queryOptions({}),
	);
	const auth = useAuth();
	const currentTerm = dashboardData?.sessions
		?.flatMap((session) =>
			session.terms.map((term) => ({
				...term,
				sessionId: session.id,
				sessionName: session.name,
				sessionStatus: session.status,
			})),
		)
		.find((term) => term.id === auth.profile?.termId);

	return (
		<DropdownMenu>
			<DropdownMenu.Trigger asChild>
				<Button
					variant="outline"
					className="h-auto min-h-12 w-full justify-between gap-3 rounded-2xl border-border/70 bg-background/90 px-3 py-2 text-left shadow-sm md:w-[320px]"
				>
					<div className="flex min-w-0 items-center gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<CalendarRange className="h-4 w-4" />
						</div>
						<div className="min-w-0">
							<p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
								Active Term
							</p>
							<p className="truncate text-sm font-semibold text-foreground">
								{currentTerm?.title ?? "Select Term"}
							</p>
							<p className="truncate text-xs text-muted-foreground">
								{currentTerm?.sessionName ??
									"Choose the working session and term"}
							</p>
						</div>
					</div>
					<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				align="end"
				className="w-[min(92vw,26rem)] rounded-2xl p-2"
			>
				{dashboardData?.sessions?.map((session) => (
					<DropdownMenu.Group key={session.id}>
						<div className="flex items-center justify-between px-2 pb-1 pt-2">
							<DropdownMenu.Label className="px-0 py-0 text-sm font-semibold">
								{session.name}
							</DropdownMenu.Label>
							<Badge
								variant={session.status === "current" ? "default" : "outline"}
								className="capitalize"
							>
								{session.status}
							</Badge>
						</div>
						<div className="space-y-1 pb-2">
							{session.terms?.map((term) => {
								const isActive = term.id === auth.profile?.termId;
								return (
									<DropdownMenu.Item
										key={term.id}
										className={cn(
											"flex items-start justify-between rounded-xl px-3 py-3",
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
											<span className="text-sm font-medium">{term.title}</span>
											<span className="text-xs text-muted-foreground capitalize">
												{term.status}
											</span>
										</div>
										{isActive ? (
											<Check className="mt-0.5 h-4 w-4 shrink-0" />
										) : null}
									</DropdownMenu.Item>
								);
							})}
						</div>
					</DropdownMenu.Group>
				))}
			</DropdownMenu.Content>
		</DropdownMenu>
	);
}
