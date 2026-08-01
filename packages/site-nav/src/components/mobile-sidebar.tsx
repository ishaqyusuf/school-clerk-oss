import { Button } from "@school-clerk/ui/button";
import { Sheet } from "@school-clerk/ui/composite";
import { Icons as CustomIcons } from "@school-clerk/ui/custom/icons";
import { Icons } from "@school-clerk/ui/icons";
import { useState } from "react";

import { ModuleSelector } from "./module-selector";
import { NavsList } from "./navs-list";
import { useSiteNav } from "./use-site-nav";

export function MobileSidebar() {
	const [isOpen, setOpen] = useState(false);
	const {
		hasSidebar,
		props: { mobileSidebarFooter, mobileSidebarLogo },
	} = useSiteNav();

	if (!hasSidebar) return null;

	return (
		<div className="md:hidden">
			<Sheet.Root open={isOpen} onOpenChange={setOpen}>
				<Sheet.Trigger asChild>
					<Button
						variant="outline"
						size="icon"
						aria-label="Open navigation"
						className="relative flex size-11 items-center rounded-full md:hidden"
					>
						<Icons.Menu size={18} />
					</Button>
				</Sheet.Trigger>
				<Sheet.Content
					side="left"
					hideClose
					className="flex h-dvh w-[min(88vw,340px)] flex-col gap-0 border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none motion-reduce:transition-none"
				>
					<Sheet.Header className="sr-only">
						<Sheet.Title>Navigation</Sheet.Title>
						<Sheet.Description>
							Choose a SchoolClerk destination.
						</Sheet.Description>
					</Sheet.Header>

					<div className="flex min-h-[70px] shrink-0 items-center justify-between border-b border-sidebar-border px-4 pt-[env(safe-area-inset-top)]">
						<div className="min-w-0">
							{mobileSidebarLogo ?? <CustomIcons.LogoLg />}
						</div>
						<Sheet.Close asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label="Close navigation"
								className="size-11 shrink-0 rounded-full"
							>
								<Icons.Close size={18} />
							</Button>
						</Sheet.Close>
					</div>

					<div className="shrink-0 border-b border-sidebar-border px-4 py-3">
						<ModuleSelector forceExpanded expandNavOnOpen={false} />
					</div>

					<div
						data-site-nav-scroll-container="true"
						className="scrollbar-hide min-h-0 flex-1 overflow-auto overscroll-contain py-3"
					>
						<NavsList mobile onSelect={() => setOpen(false)} />
					</div>
					{mobileSidebarFooter ? (
						<div className="shrink-0 border-t border-sidebar-border bg-sidebar p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
							{mobileSidebarFooter}
						</div>
					) : (
						<div className="h-[env(safe-area-inset-bottom)] shrink-0" />
					)}
				</Sheet.Content>
			</Sheet.Root>
		</div>
	);
}
