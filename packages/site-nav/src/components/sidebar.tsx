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
		isPinned,
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
				"fixed inset-y-0 left-0 z-50 hidden flex-shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none md:flex",
				// Pinned at xl: the CSS width matches before hydration so the shell never jumps.
				isPinned
					? "w-[240px]"
					: isExpanded
						? "w-[268px] shadow-2xl shadow-black/10 dark:shadow-black/50"
						: "w-[84px] xl:w-[240px]",
			)}
		>

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
