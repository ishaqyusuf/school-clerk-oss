import { createContextFactory } from "@/utils/context-factory";
import { useStudentParams } from "./use-student-params";
import { useTRPC } from "@/trpc/client";
import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

export const {
  Provider: StudentOverviewSheetProvider,
  useContext: useStudentOverviewSheet,
} = createContextFactory(() => {
  const { studentViewId, studentViewTab, setParams } = useStudentParams();
  const isOpen = Boolean(studentViewId);

  // const { setParams, ...params } = useStudentParams();

  const trpc = useTRPC();
  const {
    data: overviewData,
    error,
    isLoading,
  } = useSuspenseQuery(
    trpc.students.overview.queryOptions(
      {
        studentId: studentViewId,
      },
      {
        enabled: isOpen,
      }
    )
  );
  const qc = useQueryClient();
  return {
    overviewData,
    isLoading,
    isOpen,
    refresh() {
      qc.invalidateQueries({
        queryKey: trpc.students.overview.queryKey({
          studentId: studentViewId,
        }),
      });
    },
  };
});
