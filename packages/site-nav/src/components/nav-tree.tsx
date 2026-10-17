import type { ModuleKey, ResolvedNavItem } from "@school-clerk/navigation";
import { cn } from "@school-clerk/ui/cn";
import { Icon, type IconKeys, Icons } from "@school-clerk/ui/custom/icons";
import { Input } from "@school-clerk/ui/input";
import { Kbd } from "@school-clerk/ui/kbd";
import {
	Fragment,
	type KeyboardEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";

import { normalizeNavPath } from "../lib/active-navigation";
import {
	type NavTreeGroup,
	filterNavigation,
	splitNavMatch,
} from "../lib/nav-filter";
import { NavLink } from "./nav-link";
import { useSiteNav } from "./use-site-nav";

/**
 * Every module as a collapsible group in one list, with a page filter on top (workshop
 * navigation/side-nav-clean, direction 03 "One tree"). Collapsed, only module icons show.
 */
export function NavTree({
	mobile = false,
	onSelect,
}: {
	mobile?: boolean;
	onSelect?: () => void;
}) {
	const {
		activeNavigation,
		expandSiteNav,
		isExpanded,
		mainMenuRef,
		modules,
		props: { pathName },
	} = useSiteNav();
	const showDetails = mobile || isExpanded;
	const activeModuleKey = activeNavigation?.module.key ?? null;
	const [query, setQuery] = useState("");
	const [openKeys, setOpenKeys] = useState<ReadonlySet<ModuleKey>>(
		() => new Set(activeModuleKey ? [activeModuleKey] : []),
	);
	const filterId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const focusFilterRef = useRef(false);
	const groups = useMemo(
		() => filterNavigation(modules, query),
		[modules, query],
	);
	const isFiltering = query.trim().length > 0;
	const isSingleModule = modules.length === 1;

	// Arriving on a page opens its module and ends any filter that led there.
	useEffect(() => {
		if (!pathName) return;
		setQuery("");
		if (!activeModuleKey) return;
		setOpenKeys((current) =>
			current.has(activeModuleKey)
				? current
				: new Set(current).add(activeModuleKey),
		);
	}, [activeModuleKey, pathName]);

	// "/" jumps to the filter from anywhere outside a text field (desktop sidebar only).
	useEffect(() => {
		if (mobile) return;
		function onKeyDown(event: globalThis.KeyboardEvent) {
			if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
				return;
			const target = event.target as HTMLElement | null;
			if (target?.closest("input, textarea, select, [contenteditable='true']"))
				return;
			if (!listRef.current?.offsetParent) return;
			event.preventDefault();
			if (inputRef.current) inputRef.current.focus();
			else {
				focusFilterRef.current = true;
				expandSiteNav();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [expandSiteNav, mobile]);

	useEffect(() => {
		if (showDetails && focusFilterRef.current) {
			focusFilterRef.current = false;
			inputRef.current?.focus();
		}
	}, [showDetails]);

	function toggleModule(key: ModuleKey) {
		// On the collapsed rail a module icon opens the full tree at that module.
		if (!showDetails) {
			setOpenKeys((current) => new Set(current).add(key));
			expandSiteNav();
			return;
		}
		if (isFiltering) {
			setQuery("");
			setOpenKeys((current) => new Set(current).add(key));
			return;
		}
		setOpenKeys((current) => {
			const next = new Set(current);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}

	function openFilter() {
		focusFilterRef.current = true;
		expandSiteNav();
	}

	function onFilterKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Enter") {
			const first =
				listRef.current?.querySelector<HTMLAnchorElement>("a[href]");
			if (first) {
				event.preventDefault();
				first.click();
			}
		}
		if (event.key === "Escape" && query) {
			event.preventDefault();
			event.stopPropagation();
			setQuery("");
		}
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{showDetails ? (
				<div className={cn("shrink-0 pb-2", mobile ? "px-4 pt-3" : "px-3")}>
					<label htmlFor={filterId} className="relative flex items-center">
						<span className="sr-only">Find a page</span>
						<Icons.Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
						<Input
							ref={inputRef}
							id={filterId}
							type="text"
							value={query}
							autoComplete="off"
							spellCheck={false}
							placeholder="Find a page"
							onChange={(event) => setQuery(event.target.value)}
							onKeyDown={onFilterKeyDown}
							className={cn(
								"rounded-md border-sidebar-border bg-background px-8 text-[13px] shadow-none focus-visible:border-sidebar-ring focus-visible:ring-2 focus-visible:ring-sidebar-ring/20",
								mobile ? "h-10" : "h-8",
							)}
						/>
						{mobile ? null : (
							<Kbd className="absolute right-2 border border-sidebar-border bg-transparent font-mono">
								/
							</Kbd>
						)}
					</label>
				</div>
			) : (
				// Same height as the filter so rows don't shift when the rail expands.
				<div className="shrink-0 px-3 pb-2">
					<button
						type="button"
						tabIndex={-1}
						aria-label="Find a page"
						onMouseDown={(event) => {
							event.preventDefault();
							openFilter();
						}}
						className="flex h-8 w-10 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground"
					>
						<Icons.Search className="size-4" />
					</button>
				</div>
			)}

			<div
				ref={(node) => {
					listRef.current = node;
					if (!mobile) mainMenuRef.current = node;
				}}
				data-site-nav-scroll-container="true"
				className={cn(
					"scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3",
					mobile ? "px-4" : "px-3",
				)}
			>
				<nav aria-label="Main navigation" className="flex flex-col gap-0.5">
					{groups.map((group) => (
						<NavTreeModule
							key={group.key}
							group={group}
							query={query}
							isOpen={isFiltering || isSingleModule || openKeys.has(group.key)}
							isCurrent={group.key === activeModuleKey}
							isCollapsible={!isSingleModule}
							mobile={mobile}
							showDetails={showDetails}
							onToggle={() => toggleModule(group.key)}
							onSelect={onSelect}
						/>
					))}
				</nav>
				{showDetails && isFiltering && groups.length === 0 ? (
					<p className="px-2.5 py-2 text-[12.5px] text-muted-foreground">
						No pages match “{query.trim()}”.
					</p>
				) : null}
			</div>
		</div>
	);
}

function NavTreeModule({
	group,
	query,
	isOpen,
	isCurrent,
	isCollapsible,
	mobile,
	showDetails,
	onToggle,
	onSelect,
}: {
	group: NavTreeGroup;
	query: string;
	isOpen: boolean;
	isCurrent: boolean;
	isCollapsible: boolean;
	mobile: boolean;
	showDetails: boolean;
	onToggle: () => void;
	onSelect?: () => void;
}) {
	const {
		activeNavigation,
		props: { pathName },
	} = useSiteNav();
	const listId = useId();
	const openedOnPressRef = useRef(false);
	const { module } = group;
	const isFiltering = query.trim().length > 0;
	const showItems = showDetails && isOpen;

	const icon = (
		<Icon
			name={module.icon as IconKeys}
			className={cn(
				"size-4 shrink-0",
				isCurrent ? "text-sidebar-primary" : "text-muted-foreground",
			)}
		/>
	);
	const headerClass = cn(
		"flex w-full items-center rounded-md text-left text-[13px] font-medium text-sidebar-foreground outline-none transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
		mobile ? "min-h-11 gap-2.5 px-2" : "h-[34px] gap-2.5 px-2",
		!showDetails && "w-10 justify-center px-0",
		!showDetails && isCurrent && "bg-sidebar-accent",
	);

	return (
		<div>
			{isCollapsible || !showDetails ? (
				<button
					type="button"
					aria-expanded={showDetails ? isOpen : undefined}
					aria-controls={showItems ? listId : undefined}
					aria-label={showDetails ? undefined : module.title}
					// On the rail, act on press: expanding moves rows, so the release can land elsewhere.
					onMouseDown={(event) => {
						openedOnPressRef.current = !showDetails;
						if (showDetails) return;
						event.preventDefault();
						onToggle();
					}}
					onClick={() => {
						if (openedOnPressRef.current) {
							openedOnPressRef.current = false;
							return;
						}
						onToggle();
					}}
					className={cn(headerClass, "hover:bg-sidebar-foreground/5")}
				>
					{icon}
					{showDetails ? (
						<>
							<span className="min-w-0 flex-1 truncate">
								<Highlighted text={module.title} query={query} />
							</span>
							<Icons.chevronRight
								className={cn(
									"size-3.5 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
									isOpen && "rotate-90",
								)}
							/>
						</>
					) : null}
				</button>
			) : (
				<div className={headerClass}>
					{icon}
					<span className="min-w-0 flex-1 truncate">{module.title}</span>
				</div>
			)}

			{showItems ? (
				<div
					id={listId}
					className="mb-2 ml-4 mt-0.5 border-l border-sidebar-border pl-2.5"
				>
					{group.sections.map((section, index) => (
						<Fragment key={section.key}>
							{index > 0 && !isFiltering ? (
								<div aria-hidden="true" className="h-2" />
							) : null}
							{section.items.map(({ item, children }) => {
								const isActiveItem = activeNavigation?.item.key === item.key;
								const activeChild = isActiveItem
									? activeNavigation?.child
									: null;
								const visibleChildren =
									isFiltering || isActiveItem ? children : [];
								return (
									<Fragment key={item.key}>
										<NavTreeLink
											item={item}
											query={query}
											mobile={mobile}
											pathName={pathName}
											isActive={isActiveItem && !activeChild}
											isParentOfActive={Boolean(activeChild)}
											onSelect={onSelect}
										/>
										{visibleChildren.map((child) => (
											<NavTreeLink
												key={child.key}
												item={child}
												query={query}
												mobile={mobile}
												pathName={pathName}
												isActive={activeChild?.key === child.key}
												isChild
												onSelect={onSelect}
											/>
										))}
									</Fragment>
								);
							})}
						</Fragment>
					))}
				</div>
			) : null}
		</div>
	);
}

function NavTreeLink({
	item,
	query,
	mobile,
	pathName,
	isActive,
	isParentOfActive = false,
	isChild = false,
	onSelect,
}: {
	item: ResolvedNavItem;
	query: string;
	mobile: boolean;
	pathName: string;
	isActive: boolean;
	isParentOfActive?: boolean;
	isChild?: boolean;
	onSelect?: () => void;
}) {
	const isCurrentPage =
		normalizeNavPath(pathName) === normalizeNavPath(item.href);

	return (
		<NavLink
			prefetch
			href={item.href}
			aria-current={isCurrentPage ? "page" : undefined}
			onClick={() => onSelect?.()}
			className={cn(
				"relative flex items-center truncate rounded-md px-2.5 text-[13px] text-sidebar-foreground/70 outline-none transition-colors motion-reduce:transition-none hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
				mobile ? "min-h-10" : "h-[30px]",
				isChild && "pl-[22px] text-[12.5px]",
				isParentOfActive && "font-medium text-sidebar-foreground",
				isActive &&
					"bg-sidebar-accent font-medium text-sidebar-foreground hover:bg-sidebar-accent before:absolute before:inset-y-[7px] before:-left-[11px] before:w-0.5 before:rounded-full before:bg-sidebar-primary",
			)}
		>
			<span className="min-w-0 truncate">
				<Highlighted text={item.title} query={query} />
			</span>
		</NavLink>
	);
}

function Highlighted({ text, query }: { text: string; query: string }) {
	const parts = splitNavMatch(text, query);
	if (!parts) return <>{text}</>;
	return (
		<>
			{parts.before}
			<mark className="rounded-[2px] bg-sidebar-primary/20 text-inherit">
				{parts.match}
			</mark>
			{parts.after}
		</>
	);
}
