import { cn } from "@school-clerk/ui/cn";

import { ModuleSelector } from "./module-selector";
import { NavsList } from "./navs-list";
import { useSiteNav } from "./use-site-nav";

export function Sidebar({ children }: { children?: React.ReactNode }) {
	const {
		handleNavMouseEnter,
		handleNavMouseLeave,
		handleNavBlur,
		handleNavFocus,
		hasSidebar,
		isExpanded,
		mainMenuRef,
	} = useSiteNav();

	if (!hasSidebar) return null;

	return (
		<aside
			data-site-nav-hover-surface="true"
			onFocusCapture={handleNavFocus}
			onBlurCapture={handleNavBlur}
			onMouseEnter={handleNavMouseEnter}
			onMouseLeave={handleNavMouseLeave}
			className={cn(
				"fixed inset-y-0 left-0 z-50 hidden flex-shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.08)] transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none md:flex desktop:rounded-bl-lg desktop:rounded-tl-lg",
				isExpanded ? "w-[268px]" : "w-[84px]",
			)}
		>
			<div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-sidebar-border/70" />
			<div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-sidebar-primary" />

			<div className="flex h-[70px] shrink-0 items-center border-b border-sidebar-border px-5">
				<ModuleSelector />
			</div>

			<div
				ref={mainMenuRef}
				data-site-nav-scroll-container="true"
				className="scrollbar-hide min-h-0 w-full flex-1 overflow-y-auto overscroll-contain pb-20 pt-3"
			>
				<NavsList />
			</div>
			{children}
		</aside>
	);
}
