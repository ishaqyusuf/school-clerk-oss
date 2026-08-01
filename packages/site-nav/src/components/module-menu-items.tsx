import { cn } from "@school-clerk/ui/cn";
import { Icon, type IconKeys, Icons } from "@school-clerk/ui/custom/icons";
import {
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
} from "@school-clerk/ui/dropdown-menu";

import { useSiteNav } from "./use-site-nav";

export function ModuleMenuItems({
	onSelect,
	showLabel = true,
}: {
	onSelect?: () => void;
	showLabel?: boolean;
}) {
	const { currentModule, modules, selectModule } = useSiteNav();

	if (modules.length < 2) return null;

	return (
		<DropdownMenuGroup>
			{showLabel ? (
				<DropdownMenuLabel className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
					Modules
				</DropdownMenuLabel>
			) : null}
			{modules.map((module) => {
				const isCurrent = module.key === currentModule?.key;
				return (
					<DropdownMenuItem
						key={module.key}
						role="menuitemradio"
						aria-checked={isCurrent}
						onSelect={() => {
							selectModule(module.key);
							onSelect?.();
						}}
						className={cn(
							"min-h-11 cursor-pointer text-sidebar-foreground focus:bg-sidebar-accent focus:text-sidebar-foreground",
							isCurrent && "bg-sidebar-accent font-medium",
						)}
					>
						<Icon
							name={module.icon as IconKeys}
							className="mr-2.5 size-4 shrink-0 text-sidebar-foreground/65"
						/>
						<span className="min-w-0 flex-1 truncate">{module.title}</span>
						<Icons.copyDone
							className={cn(
								"ml-3 size-4 shrink-0",
								isCurrent ? "opacity-100" : "opacity-0",
							)}
						/>
					</DropdownMenuItem>
				);
			})}
		</DropdownMenuGroup>
	);
}
