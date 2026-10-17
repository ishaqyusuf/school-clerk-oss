import { cn } from "@school-clerk/ui/cn";
import { Icons } from "@school-clerk/ui/custom/icons";

import { NavLink } from "./nav-link";
import { NavTree } from "./nav-tree";
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
		navigation,
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
						? "w-[260px] shadow-2xl shadow-black/10 dark:shadow-black/50"
						: "w-[64px] xl:w-[240px]",
			)}
		>
			<div
				className={cn(
					"flex h-16 shrink-0 items-center",
					isExpanded ? "px-4" : "justify-center",
				)}
			>
				<NavLink
					href={navigation.defaultHref}
					aria-label="School Clerk home"
					className="flex min-w-0 items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
				>
					{isExpanded ? <Icons.LogoLg /> : <Icons.Logo />}
				</NavLink>
			</div>

			<NavTree />

			{children ? (
				<div className="shrink-0 border-t border-sidebar-border p-2">
					{children}
				</div>
			) : null}
		</aside>
	);
}
