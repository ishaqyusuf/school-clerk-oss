import { DataTable } from "./tables/subjects/data-table";
import { Suspense, useState } from "react";
import { TableSkeleton } from "./tables/skeleton";
import {
  ClassroomSubjectHeader,
  type SubjectHeaderPanel,
} from "./classroom-subject-header";

import { useClassroomParams } from "@/hooks/use-classroom-params";
import { Item } from "./tables/subjects/columns";
import { useSubjectParams } from "@/hooks/use-subject-params";
import { useAuth } from "@/hooks/use-auth";

export function ClassroomSubject({ departmentId }) {
  const [panel, setPanel] = useState<SubjectHeaderPanel>(null);
  return (
    <div className="flex flex-col gap-4">
      <ClassroomSubjectHeader
        departmentId={departmentId}
        panel={panel}
        onPanelChange={setPanel}
      />
      <Suspense fallback={<TableSkeleton />}>
        <Content departmentId={departmentId} onCreate={() => setPanel("add")} />
      </Suspense>
    </div>
  );
}

function Content({ departmentId, onCreate }) {
  const { setParams } = useClassroomParams();
  const { setParams: setSubjectParams } = useSubjectParams();
  const auth = useAuth();
  return (
    <DataTable
      grid
      className="gap-0 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card md:grid-cols-1 lg:grid-cols-1"
      onCreate={onCreate}
      onClick={(item: Item) => {
        setSubjectParams({
          openSubjectSecondaryId: item.id,
          subjectTab: "overview",
        });
        setParams({
          secondaryTab: "subject-overview",
        });
      }}
      defaultFilters={{
        departmentId,
        termId: auth.profile?.termId,
      }}
    />
  );
}
