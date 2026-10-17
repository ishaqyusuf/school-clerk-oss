import { directoryViewOptions } from "@/components/view-switcher";
import { directoryViews } from "@/utils/directory-view-settings";

const CLASS_GROUP_VIEWS = ["list", "cards"] as const;

/** "View by Class" has no table form, so it offers List and Cards only. */
export function getClassroomViews(grouping: string | null | undefined) {
	return grouping === "class" ? CLASS_GROUP_VIEWS : directoryViews;
}

export function getClassroomViewOptions(grouping: string | null | undefined) {
	const views: readonly string[] = getClassroomViews(grouping);
	return directoryViewOptions.filter((option) => views.includes(option.value));
}
