import { TableSkeleton } from "./tables/skeleton";
import { Suspense, useState } from "react";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { DataTable } from "./tables/students/data-table";
import { StudentDuplicateAlert } from "./students/student-duplicate-alert";
import { ClassroomSectionHeader } from "./classroom-overview/classroom-section-nav";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Search, UserPlus } from "lucide-react";

export function ClassroomStudents({
  departmentId,
  sessionTermId,
  studentCount,
}: {
  departmentId?: string | null;
  sessionTermId?: string | null;
  studentCount?: number;
}) {
  const { setParams } = useClassroomParams();
  const openStudentForm = () => setParams({ secondaryTab: "student-form" });
  // Local search: the classroom view never reads the Students page's URL filters.
  const [search, setSearch] = useState("");
  return (
    // --header-offset sizes the table's scroll box to the space left under the
    // section header (phone: section bar above; desktop: rail beside).
    <div className="flex flex-col gap-4 [--header-offset:8px] lg:[--header-offset:148px]">
      <ClassroomSectionHeader
        title="Students"
        description={
          studentCount === undefined
            ? undefined
            : `${studentCount} enrolled this term`
        }
        actions={
          <Button size="sm" className="gap-2" onClick={openStudentForm}>
            <UserPlus className="size-4" />
            Add student
          </Button>
        }
      />
      <StudentDuplicateAlert
        classroomDepartmentId={departmentId}
        sessionTermId={sessionTermId}
        variant="inline"
      />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search students in this class"
          aria-label="Search students in this class"
          className="pl-9"
        />
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <DataTable
          scrollMode="container"
          filterMode="local"
          search={search}
          onClearSearch={() => setSearch("")}
          onCreate={openStudentForm}
          defaultFilters={{
            departmentId,
          }}
        />
      </Suspense>
    </div>
  );
}
