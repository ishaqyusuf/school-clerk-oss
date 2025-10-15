import { TableSkeleton } from "./tables/skeleton";
import { Suspense } from "react";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { DataTable } from "./tables/students/data-table";
import { ClassroomStudentHeader } from "./classroom-student-header";

export function ClassroomStudents({ departmentId }) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content departmentId={departmentId} />
    </Suspense>
  );
}
function Content({ departmentId }) {
  const { setParams } = useClassroomParams();
  return (
    <div className="">
      <ClassroomStudentHeader />
      <DataTable
        className="md:grid-cols-2 lg:grid-cols-2"
        grid
        onCreate={(e) => {
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
