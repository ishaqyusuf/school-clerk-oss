import type { ResolvedNavItem } from "@school-clerk/navigation";
import { cn } from "@school-clerk/ui/cn";
import { Icon, type IconKeys, Icons } from "@school-clerk/ui/custom/icons";
import { useEffect, useRef, useState } from "react";

import {
	isNavigationItemActive,
	normalizeNavPath,
} from "../lib/active-navigation";
import { NavChildItem } from "./nav-child-item";
import { NavLink } from "./nav-link";
import { useSiteNav } from "./use-site-nav";

const CHILD_PREVIEW_DELAY_MS = 480;

export interface NavItemProps {
	item: ResolvedNavItem;
	isActive: boolean;
	isExpanded: boolean;
	isItemExpanded: boolean;
	onToggle: (key: string) => void;
	onSelect?: () => void;
}

export function NavItem({
	item,
	isActive,
	isExpanded,
	isItemExpanded,
	onSelect,
	onToggle,
}: NavItemProps) {
	const {
		props: { pathName },
	} = useSiteNav();
	const hasChildren = item.children.length > 0;
	const [isPreviewing, setIsPreviewing] = useState(false);
	const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const childrenRef = useRef<HTMLDivElement>(null);
	const shouldShowChildren =
		isExpanded && hasChildren && (isItemExpanded || isPreviewing);

	useEffect(() => {
		return () => {
			if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
		};
	}, []);

	function beginPreview() {
		if (
			!hasChildren ||
			isItemExpanded ||
			isPreviewing ||
			previewTimeoutRef.current
		)
			return;
		previewTimeoutRef.current = setTimeout(() => {
			setIsPreviewing(true);
			previewTimeoutRef.current = null;
		}, CHILD_PREVIEW_DELAY_MS);
	}

	function endPreview() {
		if (previewTimeoutRef.current) {
			clearTimeout(previewTimeoutRef.current);
			previewTimeoutRef.current = null;
		}
		setIsPreviewing(false);
	}

	function toggleChildren(event: React.MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		const scroller = childrenRef.current?.closest<HTMLElement>(
			"[data-site-nav-scroll-container]",
		);
		const distanceFromBottom = scroller
			? scroller.scrollHeight - scroller.scrollTop
			: null;
		onToggle(item.key);
		setIsPreviewing(false);
		if (isItemExpanded && scroller && distanceFromBottom !== null) {
			requestAnimationFrame(() => {
				scroller.scrollTop = Math.max(
					0,
					scroller.scrollHeight - distanceFromBottom,
				);
			});
		}
	}

	const iconName = item.icon ?? "dashboard";
	const isCurrentPage =
		normalizeNavPath(pathName) === normalizeNavPath(item.href);

	return (
		<div
			onMouseEnter={beginPreview}
			onMouseLeave={(event) => {
				if (!event.currentTarget.contains(document.activeElement)) endPreview();
			}}
			onFocus={beginPreview}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) endPreview();
			}}
		>
			<div className="relative">
				<NavLink
					prefetch
					href={item.href}
					aria-current={isCurrentPage ? "page" : undefined}
					onClick={() => onSelect?.()}
					className={cn(
						"group flex h-11 items-center rounded-lg text-sidebar-foreground/66 outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
						isExpanded ? "gap-3 px-3" : "w-11 justify-center px-0",
						isExpanded && hasChildren && "pr-12",
						isActive
							? "bg-sidebar-primary/10 font-semibold text-sidebar-primary shadow-[inset_0_0_0_1px_rgba(99,91,255,0.09)]"
							: "hover:bg-sidebar-accent hover:text-sidebar-foreground",
					)}
				>
					<Icon
						name={iconName as IconKeys}
						className={cn(
							"size-[18px] shrink-0",
							isActive
								? "text-sidebar-primary"
								: "text-sidebar-foreground/55 group-hover:text-sidebar-foreground/80",
						)}
					/>
					{isExpanded ? (
						<span className="min-w-0 flex-1 truncate text-sm">
							{item.title}
						</span>
					) : (
						<span className="sr-only">{item.title}</span>
					)}
				</NavLink>

				{isExpanded && hasChildren ? (
					<button
						type="button"
						aria-label={`${shouldShowChildren ? "Collapse" : "Expand"} ${item.title}`}
						aria-expanded={shouldShowChildren}
						onClick={toggleChildren}
						className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-lg text-sidebar-foreground/45 outline-none hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
					>
						<Icons.chevronDown
							className={cn(
								"size-4 transition-transform motion-reduce:transition-none",
								shouldShowChildren && "rotate-180",
							)}
						/>
					</button>
				) : null}
			</div>

			{hasChildren ? (
				<div
					ref={childrenRef}
					className={cn(
						"grid transition-[grid-template-rows,opacity] duration-200 motion-reduce:transition-none",
						shouldShowChildren
							? "grid-rows-[1fr] opacity-100"
							: "grid-rows-[0fr] opacity-0",
					)}
				>
					<div className="overflow-hidden">
						<div className="pb-1 pl-8 pt-1">
							{item.children.map((child) => (
								<NavChildItem
									key={child.key}
									child={child}
									isActive={isNavigationItemActive(pathName, child)}
									onSelect={onSelect}
								/>
							))}
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
