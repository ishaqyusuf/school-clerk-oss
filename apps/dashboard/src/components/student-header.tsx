import { OpenStudentImport } from "./open-student-import";
import { OpenStudentSheet } from "./open-student-sheet";
import { StudentSearchFilter } from "./student-search-filter";
import { StudentsColumnVisibility } from "./tables/students/column-visibility";

export function StudentHeader() {
	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div className="min-w-0 flex-1">
				<StudentSearchFilter />
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<StudentsColumnVisibility />
				<OpenStudentImport />
				<OpenStudentSheet />
			</div>
		</div>
	);
}
