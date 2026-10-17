import type {
	ModuleKey,
	ResolvedNavItem,
	ResolvedNavModule,
	ResolvedNavSection,
} from "@school-clerk/navigation";

export type NavTreeItem = {
	item: ResolvedNavItem;
	/** Children worth showing: all of them, or only the matching ones while filtering. */
	children: ResolvedNavItem[];
};

export type NavTreeSection = {
	key: ResolvedNavSection["key"];
	items: NavTreeItem[];
};

export type NavTreeGroup = {
	key: ModuleKey;
	module: ResolvedNavModule;
	sections: NavTreeSection[];
};

export function normalizeNavQuery(query: string) {
	return query.trim().toLowerCase();
}

function includesQuery(text: string, query: string) {
	return text.toLowerCase().includes(query);
}

/**
 * Narrows the already-resolved navigation to what matches a filter query.
 * A module title match keeps the whole module; an item match keeps the item and its children;
 * a child match keeps its parent with only the matching children. Empty sections and modules drop out.
 */
export function filterNavigation(
	modules: ResolvedNavModule[],
	rawQuery: string,
): NavTreeGroup[] {
	const query = normalizeNavQuery(rawQuery);
	const groups: NavTreeGroup[] = [];

	for (const module of modules) {
		const keepAll = !query || includesQuery(module.title, query);
		const sections: NavTreeSection[] = [];

		for (const section of module.sections) {
			const items: NavTreeItem[] = [];
			for (const item of section.items) {
				if (keepAll || includesQuery(item.title, query)) {
					items.push({ item, children: item.children });
					continue;
				}
				const children = item.children.filter((child) =>
					includesQuery(child.title, query),
				);
				if (children.length) items.push({ item, children });
			}
			if (items.length) sections.push({ key: section.key, items });
		}

		if (sections.length) groups.push({ key: module.key, module, sections });
	}

	return groups;
}

/** Splits text around the first case-insensitive match so the caller can wrap it in <mark>. */
export function splitNavMatch(text: string, rawQuery: string) {
	const query = normalizeNavQuery(rawQuery);
	const index = query ? text.toLowerCase().indexOf(query) : -1;
	if (index < 0) return null;
	return {
		after: text.slice(index + query.length),
		before: text.slice(0, index),
		match: text.slice(index, index + query.length),
	};
}
