import { cn } from "@school-clerk/ui/cn";
import { useEffect, useState } from "react";

import { NavItem } from "./nav-item";
import { useSiteNav } from "./use-site-nav";

export function NavsList({
	mobile = false,
	onSelect,
}: {
	mobile?: boolean;
	onSelect?: () => void;
}) {
	const {
		activeNavigation,
		currentModule,
		isExpanded,
		props: { pathName },
	} = useSiteNav();
	const [expandedItemKey, setExpandedItemKey] = useState<string | null>(null);
	const showDetails = mobile || isExpanded;

	useEffect(() => {
		if (!pathName) return;
		const activeItem = activeNavigation?.item;
		if (activeItem?.children.length) setExpandedItemKey(activeItem.key);
	}, [activeNavigation?.item, pathName]);

	if (!currentModule) return null;

	return (
		<nav
			aria-label={`${currentModule.title} navigation`}
			className="w-full px-3"
		>
			<div className="flex flex-col gap-4">
				{currentModule.sections.map((section, sectionIndex) => (
					<section key={section.key}>
						{showDetails && section.title ? (
							<h2
								className={cn(
									"mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40",
									sectionIndex === 0 && "mt-0",
								)}
							>
								{section.title}
							</h2>
						) : null}
						<div className="flex flex-col gap-1">
							{section.items.map((item) => (
								<NavItem
									key={item.key}
									item={item}
									isActive={activeNavigation?.item.key === item.key}
									isExpanded={showDetails}
									isItemExpanded={expandedItemKey === item.key}
									onSelect={onSelect}
									onToggle={(key) => {
										setExpandedItemKey((current) =>
											current === key ? null : key,
										);
									}}
								/>
							))}
						</div>
					</section>
				))}
			</div>
		</nav>
	);
}
