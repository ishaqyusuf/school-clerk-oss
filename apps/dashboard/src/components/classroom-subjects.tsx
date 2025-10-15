import { DataTable } from "./tables/subjects/data-table";
import { Suspense } from "react";
import { TableSkeleton } from "./tables/skeleton";
import { ClassroomSubjectHeader } from "./classroom-subject-header";

import { useClassroomParams } from "@/hooks/use-classroom-params";
import { Item } from "./tables/subjects/columns";
import { useSubjectParams } from "@/hooks/use-subject-params";

export function ClassroomSubject({ departmentId }) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content departmentId={departmentId} />
    </Suspense>
  );
}

function Content({ departmentId }) {
  const { setParams } = useClassroomParams();
  const { setParams: setSubjectParams } = useSubjectParams();
  return (
    <div>
      <ClassroomSubjectHeader departmentId={departmentId} />
      <DataTable
        grid
        className="lg:grid-cols-2"
        onCreate={(e) => {
          // setParams({
          //   secondaryTab: "subject-form",
          // });
        }}
        onClick={(item: Item) => {
          setSubjectParams({
            openSubjectSecondaryId: item.id,
            subjectTab: "overview",
          });
          setParams({
            secondaryTab: "subject-overview",
            // subjectOverviewId: item.id,
          });
        }}
        defaultFilters={{
          departmentId,
        }}
      />
    </div>
  );
}
