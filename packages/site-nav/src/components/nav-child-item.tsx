import type { ResolvedNavItem } from "@school-clerk/navigation";
import { cn } from "@school-clerk/ui/cn";

import { NavLink } from "./nav-link";

export function NavChildItem({
	child,
	isActive,
	onSelect,
}: {
	child: ResolvedNavItem;
	isActive: boolean;
	onSelect?: () => void;
}) {
	return (
		<NavLink
			prefetch
			href={child.href}
			aria-current={isActive ? "page" : undefined}
			onClick={() => onSelect?.()}
			className={cn(
				"relative flex min-h-11 items-center border-l border-sidebar-border px-4 text-xs font-medium text-sidebar-foreground/55 outline-none transition-colors motion-reduce:transition-none hover:border-sidebar-primary/45 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
				isActive && "border-sidebar-primary text-sidebar-primary",
			)}
		>
			{child.title}
		</NavLink>
	);
}
