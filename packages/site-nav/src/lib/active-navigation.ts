import type {
	ResolvedNavItem,
	ResolvedNavModule,
} from "@school-clerk/navigation";

export type ActiveNavigation = {
	child: ResolvedNavItem | null;
	item: ResolvedNavItem;
	module: ResolvedNavModule;
};

export function normalizeNavPath(path = "") {
	const pathname = path.split(/[?#]/, 1)[0] || "";
	if (pathname.length > 1 && pathname.endsWith("/")) {
		return pathname.slice(0, -1).toLowerCase();
	}
	return pathname.toLowerCase();
}

function pathMatchesPrefix(path: string, prefix: string) {
	return path === prefix || path.startsWith(`${prefix}/`);
}

export function findActiveNavigation(
	rawPath: string | null | undefined,
	modules: ResolvedNavModule[],
): ActiveNavigation | null {
	const path = normalizeNavPath(rawPath ?? "");
	if (!path) return null;

	for (const module of modules) {
		for (const section of module.sections) {
			for (const item of section.items) {
				if (normalizeNavPath(item.href) === path) {
					return { child: null, item, module };
				}
				for (const child of item.children) {
					if (normalizeNavPath(child.href) === path) {
						return { child, item, module };
					}
				}
			}
		}
	}

	const candidates: Array<ActiveNavigation & { prefixLength: number }> = [];
	for (const module of modules) {
		for (const section of module.sections) {
			for (const item of section.items) {
				for (const childPath of item.childPaths) {
					const prefix = normalizeNavPath(childPath);
					if (prefix && pathMatchesPrefix(path, prefix)) {
						candidates.push({
							child: null,
							item,
							module,
							prefixLength: prefix.length,
						});
					}
				}
				for (const child of item.children) {
					for (const childPath of child.childPaths) {
						const prefix = normalizeNavPath(childPath);
						if (prefix && pathMatchesPrefix(path, prefix)) {
							candidates.push({
								child,
								item,
								module,
								prefixLength: prefix.length,
							});
						}
					}
				}
			}
		}
	}

	const match = candidates.sort(
		(left, right) => right.prefixLength - left.prefixLength,
	)[0];
	return match
		? { child: match.child, item: match.item, module: match.module }
		: null;
}

export function isNavigationItemActive(
	rawPath: string | null | undefined,
	item: ResolvedNavItem,
) {
	const path = normalizeNavPath(rawPath ?? "");
	if (!path) return false;
	if (normalizeNavPath(item.href) === path) return true;
	return item.childPaths.some((childPath) => {
		const prefix = normalizeNavPath(childPath);
		return Boolean(prefix && pathMatchesPrefix(path, prefix));
	});
}
