import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { Icon, type IconKeys, Icons } from "@school-clerk/ui/custom/icons";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { useState } from "react";

import { ModuleMenuItems } from "./module-menu-items";
import { useSiteNav } from "./use-site-nav";

interface ModuleSelectorProps {
	expandNavOnOpen?: boolean;
	forceExpanded?: boolean;
}

function ModuleIdentity({ expanded }: { expanded: boolean }) {
	const { currentModule } = useSiteNav();
	if (!currentModule) return null;

	return (
		<div
			className={cn(
				"flex h-11 items-center rounded-lg text-sidebar-foreground",
				expanded ? "w-full gap-3 px-3" : "w-11 justify-center px-0",
			)}
		>
			<Icon
				name={currentModule.icon as IconKeys}
				className="size-[18px] shrink-0 text-sidebar-primary"
			/>
			{expanded ? (
				<span className="min-w-0 flex-1 text-left">
					<span className="block truncate text-sm font-semibold">
						{currentModule.title}
					</span>
					{currentModule.subtitle ? (
						<span className="block truncate text-[11px] font-normal text-sidebar-foreground/50">
							{currentModule.subtitle}
						</span>
					) : null}
				</span>
			) : null}
		</div>
	);
}

export function ModuleSelector({
	expandNavOnOpen = true,
	forceExpanded = false,
}: ModuleSelectorProps = {}) {
	const {
		collapseSiteNavIfIdle,
		currentModule,
		expandSiteNav,
		handleNavFloatingMouseEnter,
		handleNavFloatingMouseLeave,
		handleNavBlur,
		handleNavFocus,
		isExpanded,
		modules,
	} = useSiteNav();
	const [open, setOpen] = useState(false);
	const showDetails = forceExpanded || isExpanded;

	if (!currentModule || modules.length === 0) return null;
	if (modules.length === 1) return <ModuleIdentity expanded={showDetails} />;

	return (
		<DropdownMenu
			modal={false}
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen && expandNavOnOpen) expandSiteNav();
				if (!nextOpen && expandNavOnOpen) {
					queueMicrotask(collapseSiteNavIfIdle);
				}
			}}
		>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					aria-label="Select module"
					className={cn(
						"h-11 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent",
						showDetails
							? "w-full justify-start gap-3 px-3"
							: "w-11 justify-center px-0",
					)}
				>
					<Icon
						name={currentModule.icon as IconKeys}
						className="size-[18px] shrink-0 text-sidebar-primary"
					/>
					{showDetails ? (
						<>
							<span className="min-w-0 flex-1 text-left">
								<span className="block truncate text-sm font-semibold">
									{currentModule.title}
								</span>
								{currentModule.subtitle ? (
									<span className="block truncate text-[11px] font-normal text-sidebar-foreground/50">
										{currentModule.subtitle}
									</span>
								) : null}
							</span>
							<Icons.chevronDown className="size-4 shrink-0 text-sidebar-foreground/45" />
						</>
					) : null}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				data-site-nav-hover-surface="true"
				onFocusCapture={expandNavOnOpen ? handleNavFocus : undefined}
				onBlurCapture={expandNavOnOpen ? handleNavBlur : undefined}
				onMouseEnter={expandNavOnOpen ? handleNavFloatingMouseEnter : undefined}
				onMouseLeave={expandNavOnOpen ? handleNavFloatingMouseLeave : undefined}
				align="start"
				side="bottom"
				sideOffset={7}
				className="w-[min(17rem,calc(100vw-2rem))] rounded-lg border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[0_16px_42px_rgba(15,23,42,0.16)] motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none"
			>
				<ModuleMenuItems showLabel={false} onSelect={() => setOpen(false)} />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
