"use client";

import { resolveDashboardNavigation } from "@/features/navigation/dashboard-navigation";
import { useAuth } from "@/hooks/use-auth";
import { useMemo } from "react";

/** Every href/childPath in a resolved navigation tree. */
export function collectNavigationPaths(value: unknown, into = new Set<string>()) {
	if (Array.isArray(value)) {
		for (const entry of value) collectNavigationPaths(entry, into);
		return into;
	}
	if (!value || typeof value !== "object") return into;
	const record = value as Record<string, unknown>;
	if (typeof record.href === "string") into.add(record.href);
	if (Array.isArray(record.childPaths)) {
		for (const path of record.childPaths) if (typeof path === "string") into.add(path);
	}
	for (const [key, child] of Object.entries(record)) {
		if (key !== "href" && key !== "childPaths" && typeof child === "object") {
			collectNavigationPaths(child, into);
		}
	}
	return into;
}

/** True when a nav path covers the target route (same path or a parent/child). */
export function routeIsReachable(paths: Iterable<string>, href: string) {
	const target = href.split("?")[0]?.replace(/\/$/, "") || "/";
	for (const path of paths) {
		const base = path.split("?")[0]?.replace(/\/$/, "") || "/";
		if (base === "/") continue;
		if (target === base || target.startsWith(`${base}/`) || base.startsWith(`${target}/`)) {
			return true;
		}
	}
	return false;
}

/**
 * Activity actions point at admin routes (/students, /academic/classes). A
 * recipient whose role cannot reach that route (a teacher) must not get a
 * button that leads to an error page.
 */
export function useCanOpenRoute() {
	const { role } = useAuth();
	const paths = useMemo(
		() => (role ? collectNavigationPaths(resolveDashboardNavigation(role)) : null),
		[role],
	);
	return (href: string | null | undefined) =>
		Boolean(href && paths && routeIsReachable(paths, href));
}
