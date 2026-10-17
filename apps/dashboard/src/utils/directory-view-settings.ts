import { z } from "zod";

export const directoryViews = ["table", "list", "cards"] as const;
export type DirectoryView = (typeof directoryViews)[number];

export const directoryPageIds = ["students", "classrooms"] as const;
export type DirectoryPageId = (typeof directoryPageIds)[number];

/** URL key for the view. Classrooms already use `view` for Stream/Class grouping. */
export const DIRECTORY_VIEW_QUERY_KEY = "display";

export const directoryViewInputSchema = z
	.object({
		pageId: z.enum(directoryPageIds),
		view: z.enum(directoryViews),
	})
	.strict();

export function parseSavedDirectoryView(value: unknown): DirectoryView | null {
	return directoryViews.find((view) => view === value) ?? null;
}

/**
 * One cookie per page. Cookies are host-only, and each school has its own
 * dashboard host, so a saved view never leaks between schools.
 */
export function getDirectoryViewCookie(pageId: DirectoryPageId) {
	return `directory-view-${pageId}`;
}

/** URL beats the saved view; otherwise phones prefer list and desktops prefer table. */
export function resolveDirectoryView({
	urlView,
	savedView,
	smallScreen,
	options,
}: {
	urlView: DirectoryView | null;
	savedView: DirectoryView | null;
	smallScreen: boolean;
	options: readonly [DirectoryView, ...DirectoryView[]];
}): DirectoryView {
	if (urlView && options.includes(urlView)) return urlView;
	if (savedView && options.includes(savedView)) return savedView;
	const preferred: readonly DirectoryView[] = smallScreen
		? ["list", "cards", "table"]
		: ["table", "list", "cards"];
	return preferred.find((view) => options.includes(view)) ?? options[0];
}
