import { createContextFactory } from "@/utils/context-factory";
import { useStudentParams } from "./use-student-params";
import { useTRPC } from "@/trpc/client";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

export type StudentOverviewTab =
  | "overview"
  | "academics"
  | "attendance"
  | "finance";

type StudentOverviewProviderOptions = {
  mode?: "sheet" | "page";
  studentId?: string | null;
  initialTab?: StudentOverviewTab;
  initialTermId?: string | null;
  initialTermSheetId?: string | null;
  onStudentSelect?: (
    studentId: string,
    options?: { termId?: string | null; termSheetId?: string | null }
  ) => void;
};

export const {
  Provider: StudentOverviewSheetProvider,
  useContext: useStudentOverviewSheet,
} = createContextFactory((options: StudentOverviewProviderOptions = {}) => {
  const {
    studentViewId,
    studentViewTab,
    studentViewTermId,
    studentTermSheetId,
    setParams,
  } = useStudentParams();
  const mode = options.mode ?? "sheet";
  const isSheetMode = mode === "sheet";
  const studentId = isSheetMode ? studentViewId : options.studentId ?? null;
  const isOpen = Boolean(studentId);
  const [pageTab, setPageTab] = useState<StudentOverviewTab>(
    options.initialTab ?? "overview"
  );
  const [pageTermId, setPageTermId] = useState<string | null>(
    options.initialTermId ?? null
  );
  const [pageTermSheetId, setPageTermSheetId] = useState<string | null>(
    options.initialTermSheetId ?? null
  );
  const activeTab: StudentOverviewTab = isSheetMode
    ? ((studentViewTab as StudentOverviewTab | null) ?? "academics")
    : pageTab;
  const selectedTermId = isSheetMode ? studentViewTermId ?? null : pageTermId;
  const selectedTermSheetId = isSheetMode
    ? studentTermSheetId ?? null
    : pageTermSheetId;

  const trpc = useTRPC();
  const { data: overviewData, isLoading } = useSuspenseQuery(
    trpc.students.overview.queryOptions(
      {
        studentId: studentId ?? "",
      },
      {
        enabled: !!studentId && isOpen,
      }
    )
  );

  const activeStudentTerm = useMemo(() => {
    const terms = overviewData?.studentTerms ?? [];
    const selectedTerm = terms.find((term) => term.termId === selectedTermId);

    if (selectedTerm) return selectedTerm;

    return terms.find((term) => !!term.studentTermId) ?? terms[0] ?? null;
  }, [overviewData?.studentTerms, selectedTermId]);

  useEffect(() => {
    if (!isOpen || !activeStudentTerm) return;

    const nextTermId = activeStudentTerm.termId ?? null;
    const nextTermSheetId = activeStudentTerm.studentTermId ?? null;

    if (
      selectedTermId === nextTermId &&
      (selectedTermSheetId ?? null) === nextTermSheetId
    ) {
      return;
    }

    if (!isSheetMode) {
      setPageTermId(nextTermId);
      setPageTermSheetId(nextTermSheetId);
      return;
    }

    setParams({
      studentViewTermId: nextTermId,
      studentTermSheetId: nextTermSheetId,
    });
  }, [
    activeStudentTerm,
    isOpen,
    isSheetMode,
    selectedTermId,
    selectedTermSheetId,
    setParams,
  ]);

  const qc = useQueryClient();
  return {
    activeStudentTerm,
    activeTab,
    isOpen,
    isPageMode: !isSheetMode,
    isSheetMode,
    mode,
    overviewData,
    isLoading,
    selectedTermId,
    selectedTermSheetId,
    setActiveTab(tab: StudentOverviewTab) {
      if (isSheetMode) {
        setParams({
          studentViewTab: tab,
        });
        return;
      }

      setPageTab(tab);
    },
    selectStudent(
      nextStudentId: string,
      nextOptions?: { termId?: string | null; termSheetId?: string | null }
    ) {
      if (isSheetMode) {
        setParams({
          studentViewId: nextStudentId,
          studentViewTermId: nextOptions?.termId ?? null,
          studentTermSheetId: nextOptions?.termSheetId ?? null,
        });
        return;
      }

      options.onStudentSelect?.(nextStudentId, nextOptions);
    },
    selectTerm(nextTermId: string, nextTermSheetId?: string | null) {
      if (isSheetMode) {
        setParams({
          studentViewTermId: nextTermId,
          studentTermSheetId: nextTermSheetId ?? null,
        });
        return;
      }

      setPageTermId(nextTermId);
      setPageTermSheetId(nextTermSheetId ?? null);
    },
    refresh() {
      qc.invalidateQueries({
        queryKey: trpc.students.overview.queryKey({
          studentId: studentId ?? "",
        }),
      });
    },
    studentId,
  };
});
