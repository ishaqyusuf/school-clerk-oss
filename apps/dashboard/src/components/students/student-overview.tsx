import { useTRPC } from "@/trpc/client";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { TableSkeleton } from "../tables/skeleton";
import { Suspense } from "react";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useStudentParams } from "@/hooks/use-student-params";

export function StudentOverview({}) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content />
    </Suspense>
  );
}
function Content({}) {
  const { setParams, ...params } = useStudentParams();

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data, error, isLoading } = useSuspenseQuery(
    trpc.students.overview.queryOptions(
      {
        studentId: params.studentViewId,
        termSheetId: params.studentTermSheetId,
      },
      {
        enabled: true,
        staleTime: 60 * 1000,
      }
    )
  );

  const ctx = useClassroomParams();
  return (
    <>
      <div></div>
    </>
  );
}
