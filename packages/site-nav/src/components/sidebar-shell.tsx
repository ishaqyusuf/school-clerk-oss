import { cn } from "@school-clerk/ui/cn";
import { useSiteNav } from "./use-site-nav";

export function SidebarShell({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	const { hasSidebar } = useSiteNav();
	return (
		<div className={cn(className, hasSidebar && "md:ml-[84px]")}>
			{children}
		</div>
	);
}
