import { TableSkeleton } from "./tables/skeleton";
import { Suspense } from "react";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { DataTable } from "./tables/students/data-table";
import { ClassroomStudentHeader } from "./classroom-student-header";
import { StudentDuplicateAlert } from "./students/student-duplicate-alert";

export function ClassroomStudents({ departmentId, sessionTermId }) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content departmentId={departmentId} sessionTermId={sessionTermId} />
    </Suspense>
  );
}
function Content({ departmentId, sessionTermId }) {
  const { setParams } = useClassroomParams();
  return (
    <div className="flex flex-col gap-3">
      <StudentDuplicateAlert
        classroomDepartmentId={departmentId}
        sessionTermId={sessionTermId}
        showCount
        compact
      />
      <ClassroomStudentHeader />
      <DataTable
        className="md:grid-cols-2 lg:grid-cols-2"
        grid
        onCreate={() => {
          setParams({
            secondaryTab: "student-form",
          });
        }}
        defaultFilters={{
          departmentId,
        }}
      />
    </div>
  );
}
