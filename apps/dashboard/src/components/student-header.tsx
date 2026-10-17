import { OpenStudentImport } from "./open-student-import";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { Button } from "@school-clerk/ui/button";
import { OpenStudentSheet } from "./open-student-sheet";
import { StudentSearchFilter } from "./student-search-filter";
import { StudentViewControls } from "./students/student-view-controls";
import type { DirectoryView } from "@/utils/directory-view-settings";

export function StudentHeader({
	savedView,
}: {
	savedView: DirectoryView | null;
}) {
	return (
		<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
			<div className="min-w-0 flex-1">
				<StudentSearchFilter />
			</div>
			<div className="grid grid-flow-col grid-cols-[minmax(0,1fr)] auto-cols-[2.75rem] items-center gap-2 md:flex md:shrink-0 max-md:[&>button]:h-11 max-md:[&>button]:w-full max-md:[&>a]:h-11">
				<Button asChild variant="outline"><Link href="/students/approvals">Approvals</Link></Button>
				<StudentViewControls savedView={savedView} />
				<OpenStudentImport />
				<OpenStudentSheet />
			</div>
		</div>
	);
}
