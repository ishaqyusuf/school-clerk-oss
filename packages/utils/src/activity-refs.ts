/**
 * Builders for the `ActivityRef` snapshots stored in activity meta (ADR-0093).
 * Every call site formats names the same way, so the feed reads consistently.
 *
 * Pure TypeScript only: shared by the API, the db package and jobs.
 */
import type { ActivityRef } from "./activity";
import { classroomDisplayName } from "./classroom-name";
import {
	type StudentNameFormat,
	type StudentNameParts,
	formatStudentName,
} from "./student-name";

type TermNameInput = {
	title?: string | null;
	session?: { title?: string | null } | null;
};

type ClassroomNameInput = {
	departmentName?: string | null;
	classRoom?: { name?: string | null } | null;
};

/** "First Term 2026/27": term title then session title, as student history shows it. */
export function activityTermName(term?: TermNameInput | null) {
	if (!term) return "";
	return [term.title?.trim(), term.session?.title?.trim()]
		.filter(Boolean)
		.join(" ");
}

export function activityTermRef(
	term?: (TermNameInput & { id: string }) | null,
): ActivityRef | null {
	if (!term) return null;
	return { id: term.id, name: activityTermName(term) || "Academic term" };
}

export function activityClassroomName(classroom?: ClassroomNameInput | null) {
	if (!classroom) return "";
	return classroomDisplayName({
		className: classroom.classRoom?.name,
		departmentName: classroom.departmentName,
	});
}

export function activityClassroomRef(
	classroom?: (ClassroomNameInput & { id: string }) | null,
): ActivityRef | null {
	if (!classroom) return null;
	return {
		id: classroom.id,
		name: activityClassroomName(classroom) || "Classroom",
	};
}

export function activityStudentRef(
	student: StudentNameParts & { id: string },
	format?: StudentNameFormat | string | null,
): ActivityRef {
	return {
		id: student.id,
		name:
			formatStudentName(student, (format ?? undefined) as StudentNameFormat) ||
			"Student",
	};
}

/** "₦45,000" for plain-text descriptions; meta keeps the raw number. */
export function activityNaira(amount: number) {
	return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;
}
