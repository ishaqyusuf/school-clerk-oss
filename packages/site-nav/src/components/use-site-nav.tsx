import type { ResolvedNavigation } from "@school-clerk/navigation";
import {
	type ElementType,
	type FocusEvent,
	type MouseEvent,
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { findActiveNavigation } from "../lib/active-navigation";

const NAV_HOVER_EXPAND_DELAY_MS = 140;
const NAV_HOVER_COLLAPSE_DELAY_MS = 80;
const NAV_HOVER_SURFACE_SELECTOR = "[data-site-nav-hover-surface]";
/** At this width the sidebar stays expanded with labels (Blueprint, ADR-0082). Matches Tailwind `xl`. */
export const NAV_PINNED_MEDIA_QUERY = "(min-width: 1280px)";

type SiteNavContextValue = ReturnType<typeof createSiteNavContext>;

export const SiteNavContext = createContext<SiteNavContextValue | undefined>(
	undefined,
);
export const SiteNavProvider = SiteNavContext.Provider;

interface SiteNavProps {
	Link?: ElementType;
	mobileSidebarFooter?: ReactNode;
	mobileSidebarLogo?: ReactNode;
	navigation: ResolvedNavigation;
	pathName: string;
}

export const createSiteNavContext = (props: SiteNavProps) => {
	const mainMenuRef = useRef<HTMLDivElement>(null);
	const [isExpanded, setIsExpanded] = useState(false);
	const [isPinned, setIsPinned] = useState(false);
	const hoverExpandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const hoverCollapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const isPointerWithinNavRef = useRef(false);
	const isFocusWithinNavRef = useRef(false);

	const modules = props.navigation.modules;
	const activeNavigation = useMemo(
		() => findActiveNavigation(props.pathName, modules),
		[modules, props.pathName],
	);
	const hasSidebar =
		(props.navigation.surface === "sidebar" ||
			props.navigation.surface === "compact") &&
		modules.length > 0;

	const clearHoverExpandTimeout = useCallback(() => {
		if (!hoverExpandTimeoutRef.current) return;
		clearTimeout(hoverExpandTimeoutRef.current);
		hoverExpandTimeoutRef.current = null;
	}, []);

	const clearHoverCollapseTimeout = useCallback(() => {
		if (!hoverCollapseTimeoutRef.current) return;
		clearTimeout(hoverCollapseTimeoutRef.current);
		hoverCollapseTimeoutRef.current = null;
	}, []);

	const expandSiteNav = useCallback(() => {
		clearHoverExpandTimeout();
		clearHoverCollapseTimeout();
		setIsExpanded(true);
	}, [clearHoverCollapseTimeout, clearHoverExpandTimeout]);

	const reconcilePointerWithinNav = useCallback(() => {
		if (typeof document === "undefined") return isPointerWithinNavRef.current;
		isPointerWithinNavRef.current = Boolean(
			document.querySelector(`${NAV_HOVER_SURFACE_SELECTOR}:hover`),
		);
		return isPointerWithinNavRef.current;
	}, []);

	const collapseSiteNavIfIdle = useCallback(() => {
		if (!reconcilePointerWithinNav() && !isFocusWithinNavRef.current) {
			setIsExpanded(false);
		}
	}, [reconcilePointerWithinNav]);

	const markNavHoverSurfaceEntered = useCallback(() => {
		isPointerWithinNavRef.current = true;
		clearHoverCollapseTimeout();
	}, [clearHoverCollapseTimeout]);

	const scheduleNavIdleCollapse = useCallback(() => {
		clearHoverExpandTimeout();
		clearHoverCollapseTimeout();
		hoverCollapseTimeoutRef.current = setTimeout(() => {
			if (!reconcilePointerWithinNav() && !isFocusWithinNavRef.current) {
				setIsExpanded(false);
			}
			hoverCollapseTimeoutRef.current = null;
		}, NAV_HOVER_COLLAPSE_DELAY_MS);
	}, [
		clearHoverCollapseTimeout,
		clearHoverExpandTimeout,
		reconcilePointerWithinNav,
	]);

	const handleNavMouseEnter = useCallback(() => {
		markNavHoverSurfaceEntered();
		if (isExpanded || hoverExpandTimeoutRef.current) return;
		hoverExpandTimeoutRef.current = setTimeout(() => {
			if (isPointerWithinNavRef.current) setIsExpanded(true);
			hoverExpandTimeoutRef.current = null;
		}, NAV_HOVER_EXPAND_DELAY_MS);
	}, [isExpanded, markNavHoverSurfaceEntered]);

	const handleNavFocus = useCallback(() => {
		isFocusWithinNavRef.current = true;
		expandSiteNav();
	}, [expandSiteNav]);

	const handleNavBlur = useCallback(
		(event: FocusEvent) => {
			const target = event.relatedTarget;
			if (
				target instanceof Element &&
				target.closest(NAV_HOVER_SURFACE_SELECTOR)
			) {
				return;
			}
			isFocusWithinNavRef.current = false;
			if (!reconcilePointerWithinNav()) scheduleNavIdleCollapse();
		},
		[reconcilePointerWithinNav, scheduleNavIdleCollapse],
	);

	const isMovingToNavHoverSurface = useCallback((event?: MouseEvent) => {
		const target = event?.relatedTarget;
		return target instanceof Element
			? Boolean(target.closest(NAV_HOVER_SURFACE_SELECTOR))
			: false;
	}, []);

	const handleNavMouseLeave = useCallback(
		(event?: MouseEvent) => {
			if (isMovingToNavHoverSurface(event)) {
				markNavHoverSurfaceEntered();
				return;
			}
			isPointerWithinNavRef.current = false;
			if (!isFocusWithinNavRef.current) scheduleNavIdleCollapse();
		},
		[
			isMovingToNavHoverSurface,
			markNavHoverSurfaceEntered,
			scheduleNavIdleCollapse,
		],
	);

	const handleNavFloatingMouseEnter = useCallback(() => {
		markNavHoverSurfaceEntered();
		expandSiteNav();
	}, [expandSiteNav, markNavHoverSurfaceEntered]);

	const handleNavFloatingMouseLeave = useCallback(
		(event?: MouseEvent) => {
			if (isMovingToNavHoverSurface(event)) {
				markNavHoverSurfaceEntered();
				return;
			}
			isPointerWithinNavRef.current = false;
			if (!isFocusWithinNavRef.current) scheduleNavIdleCollapse();
		},
		[
			isMovingToNavHoverSurface,
			markNavHoverSurfaceEntered,
			scheduleNavIdleCollapse,
		],
	);

	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const query = window.matchMedia(NAV_PINNED_MEDIA_QUERY);
		const sync = () => setIsPinned(query.matches);
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);

	useEffect(() => {
		return () => {
			clearHoverExpandTimeout();
			clearHoverCollapseTimeout();
		};
	}, [clearHoverCollapseTimeout, clearHoverExpandTimeout]);

	return {
		activeNavigation,
		collapseSiteNavIfIdle,
		expandSiteNav,
		handleNavFloatingMouseEnter,
		handleNavFloatingMouseLeave,
		handleNavBlur,
		handleNavFocus,
		handleNavMouseEnter,
		handleNavMouseLeave,
		hasSidebar,
		isExpanded: isExpanded || isPinned,
		isPinned,
		mainMenuRef,
		modules,
		navigation: props.navigation,
		props,
		setIsExpanded,
	};
};

export const useSiteNav = () => {
	const context = useContext(SiteNavContext);
	if (context === undefined) {
		throw new Error("useSiteNav must be used within a SiteNav provider");
	}
	return context;
};
