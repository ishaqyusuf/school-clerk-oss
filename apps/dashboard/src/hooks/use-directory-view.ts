"use client";

import { updateDirectoryViewAction } from "@/actions/update-directory-view-action";
import {
	DIRECTORY_VIEW_QUERY_KEY,
	type DirectoryPageId,
	type DirectoryView,
	directoryViews,
	resolveDirectoryView,
} from "@/utils/directory-view-settings";
import { useIsMobile } from "@school-clerk/ui/hooks/use-mobile";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useRef, useState } from "react";

/**
 * The page's Table / List / Cards view. Header and directory can both call it:
 * the URL is shared, and `savedView` comes from the same server cookie.
 */
export function useDirectoryView({
	pageId,
	savedView,
	options = directoryViews,
}: {
	pageId: DirectoryPageId;
	savedView: DirectoryView | null;
	options?: readonly [DirectoryView, ...DirectoryView[]];
}) {
	const [urlView, setUrlView] = useQueryState(
		DIRECTORY_VIEW_QUERY_KEY,
		parseAsStringLiteral(directoryViews),
	);
	const smallScreen = useIsMobile();
	const view = resolveDirectoryView({
		urlView,
		savedView,
		smallScreen,
		options,
	});
	const [persistenceError, setPersistenceError] = useState<string | null>(null);
	const queue = useRef(Promise.resolve());
	const latest = useRef(0);

	function persist(next: DirectoryView) {
		const intent = ++latest.current;
		setPersistenceError(null);
		// Serialize writes so an older request cannot overwrite the latest choice.
		queue.current = queue.current.then(async () => {
			if (intent !== latest.current) return;
			try {
				const result = await updateDirectoryViewAction({ pageId, view: next });
				if (intent === latest.current) setPersistenceError(result.error);
			} catch {
				if (intent === latest.current)
					setPersistenceError("Your view could not be saved. Try again.");
			}
		});
	}

	return {
		view,
		setView: (next: DirectoryView) => {
			if (!options.includes(next)) return;
			void setUrlView(next, { history: "push", shallow: true });
			persist(next);
		},
		persistenceError,
		retryPersistence: () => persist(view),
	};
}
