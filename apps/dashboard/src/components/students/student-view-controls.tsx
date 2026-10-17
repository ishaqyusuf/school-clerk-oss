"use client";

import { StudentsColumnVisibility } from "@/components/tables/students/column-visibility";
import { ViewSwitcher, directoryViewOptions } from "@/components/view-switcher";
import { useDirectoryView } from "@/hooks/use-directory-view";
import type { DirectoryView } from "@/utils/directory-view-settings";

/** Column settings apply to Table view only, so they hide in List and Cards. */
export function StudentViewControls({
	savedView,
}: {
	savedView: DirectoryView | null;
}) {
	const { view, setView } = useDirectoryView({ pageId: "students", savedView });
	return (
		<>
			{view === "table" ? <StudentsColumnVisibility /> : null}
			<ViewSwitcher
				label="Student view"
				value={view}
				options={directoryViewOptions}
				onValueChange={setView}
			/>
		</>
	);
}
