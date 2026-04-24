"use client";

import { switchSessionTerm } from "@/actions/cookies/auth-cookie";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { DropdownMenu } from "@school-clerk/ui/composite";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
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
					className="h-9 w-full max-w-[240px] justify-between gap-2 rounded-md border-border/70 bg-background/40 px-2.5 text-left shadow-none hover:bg-muted/50 md:w-[220px]"
				>
					<div className="flex min-w-0 items-center gap-1.5">
						<span className="shrink-0 text-xs font-medium text-muted-foreground">
							Term
						</span>
						<span className="truncate text-sm font-medium text-foreground">
							{currentTerm?.title ?? "Select"}
						</span>
						{currentTerm?.sessionName ? (
							<span className="hidden truncate text-xs text-muted-foreground xl:inline">
								{currentTerm.sessionName}
							</span>
						) : null}
					</div>
					<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				align="end"
				className="w-[min(92vw,22rem)] rounded-lg p-1.5"
			>
				{dashboardData?.sessions?.map((session) => (
					<DropdownMenu.Group key={session.id}>
						<div className="flex items-center justify-between px-2 py-1">
							<DropdownMenu.Label className="px-0 py-0 text-xs font-semibold">
								{session.name}
							</DropdownMenu.Label>
							<Badge
								variant={session.status === "current" ? "default" : "outline"}
								className="h-5 rounded px-1.5 text-[10px] capitalize"
							>
								{session.status}
							</Badge>
						</div>
						<div className="space-y-0.5 pb-1">
							{session.terms?.map((term) => {
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
											<span className="text-sm font-medium">{term.title}</span>
											<span className="text-[11px] text-muted-foreground capitalize">
												{term.status}
											</span>
										</div>
										{isActive ? (
											<Check className="h-3.5 w-3.5 shrink-0" />
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
