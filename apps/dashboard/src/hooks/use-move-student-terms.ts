"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RouterOutputs } from "@school-clerk/api/trpc/routers/_app";
import { bulkChangeStudentClassSchema, studentClassChangeOptionsSchema } from "@school-clerk/utils/student-class-change-schema";
import { useTRPC } from "@/trpc/client";
import { useAuth } from "./use-auth";

type MoveResult = RouterOutputs["students"]["bulkChangeClass"];
type Options = {
  studentTermFormIds: string[];
  classroomDepartmentId: string;
  contextKey: string;
  selectionAvailable?: boolean;
  onSuccess?: (result: MoveResult) => void;
};

export function useMoveStudentTerms(options: Options) {
  const auth = useAuth();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const viewScope = { schoolId: auth.profile?.schoolId || "", userId: auth.id || "", loginSessionId: auth.sessionId || "" };
  const identityReady = !auth.isPending && !auth.isProfileLoading && !auth.isProfileError &&
    !!viewScope.schoolId && !!viewScope.userId && !!viewScope.loginSessionId &&
    auth.profile?.auth?.userId === viewScope.userId && ["ADMIN", "REGISTRAR"].includes(auth.role?.toUpperCase() ?? "");
  const studentTermFormIds = options.studentTermFormIds.map((id) => id.trim()).sort();
  const selectionInput = { studentTermFormIds, viewScope };
  const validSelection = studentClassChangeOptionsSchema.safeParse(selectionInput).success && options.selectionAvailable !== false;
  const workspaceKey = JSON.stringify([viewScope, auth.role, auth.profile?.sessionId, auth.profile?.termId]);
  const selectionKey = JSON.stringify([workspaceKey, studentTermFormIds, options.contextKey, options.selectionAvailable]);
  const scopeKey = JSON.stringify([selectionKey, options.classroomDepartmentId]);
  const targets = useQuery({
    ...trpc.students.classChangeOptions.queryOptions(selectionInput),
    enabled: identityReady && validSelection,
    retry: false, staleTime: 0, gcTime: 0,
    refetchOnMount: "always", refetchOnWindowFocus: "always", refetchOnReconnect: "always",
  });
  const candidate = targets.data;
  const matches = candidate?.scope.schoolId === viewScope.schoolId && candidate?.scope.userId === viewScope.userId &&
    candidate?.scope.loginSessionId === viewScope.loginSessionId &&
    JSON.stringify(candidate?.studentTermFormIds) === JSON.stringify(studentTermFormIds);
  const data = identityReady && validSelection && matches && targets.isSuccess &&
    targets.fetchStatus === "idle" && !targets.isPlaceholderData ? candidate : undefined;
  const targetAvailable = !!data?.classrooms.some((classroom) => classroom.id === options.classroomDepartmentId);
  const ready = !!data && targetAvailable;
  const current = useRef({ scopeKey, identityReady, ready, options });
  current.current = { scopeKey, identityReady, ready, options };
  const mounted = useRef(true);
  const activeRequest = useRef(false);
  const [failure, setFailure] = useState<{ scopeKey: string; message: string } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const mutation = useMutation(trpc.students.bulkChangeClass.mutationOptions({
    retry: false, networkMode: "always",
    onSuccess(result) {
      for (const studentId of result.studentIds) {
        void queryClient.invalidateQueries({ queryKey: trpc.students.overview.queryKey({ studentId }) });
        void queryClient.invalidateQueries({ queryKey: trpc.students.academicsOverview.queryKey({ studentId }) });
        void queryClient.invalidateQueries({ queryKey: trpc.academics.getStudentTermsList.queryKey({ studentId }) });
      }
      for (const id of result.termFormIds) {
        void queryClient.invalidateQueries({ queryKey: trpc.students.getTermFormDetails.queryKey({ id }) });
      }
      void queryClient.invalidateQueries({ queryKey: trpc.students.index.infiniteQueryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.students.analytics.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.students.duplicateGroups.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.students.classChangeOptions.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.classrooms.all.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.classrooms.getClassroomOverview.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.classrooms.getCurrentSessionClassroom.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.classrooms.getClassroomsForSession.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.academics.getPromotionStudents.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.assessments.getClassroomReportSheet.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.assessments.getPrintStatus.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.attendance.getAttendanceRoster.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.attendance.getAttendanceReport.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.attendance.getStudentAttendanceHistory.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.search.global.queryKey() });
    },
  }));

  async function submit() {
    if (activeRequest.current || !mounted.current || current.current.scopeKey !== scopeKey) return;
    activeRequest.current = true;
    setFailure(null);
    let committed = false;
    try {
      if (!current.current.ready) throw new Error("Load the current enrollment destinations and select an available class before submitting.");
      const parsed = bulkChangeStudentClassSchema.safeParse({ ...selectionInput, classroomDepartmentId: options.classroomDepartmentId });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Review the selected enrollments and destination.");
      const result = await mutation.mutateAsync(parsed.data);
      committed = true;
      if (mounted.current && current.current.identityReady && current.current.scopeKey === scopeKey) {
        current.current.options.onSuccess?.(result);
      }
    } catch (error) {
      if (!committed && mounted.current && current.current.scopeKey === scopeKey) {
        setFailure({ scopeKey, message: error instanceof Error ? error.message : "Class change could not be completed. Refresh before retrying." });
      }
    } finally {
      activeRequest.current = false;
    }
  }

  const optionsUnavailable = auth.isProfileError || (!auth.isPending && !auth.isProfileLoading && !identityReady) ||
    !validSelection || targets.isError || targets.fetchStatus === "paused" || (targets.isSuccess && !targets.isFetching && !matches);
  return {
    ready, workspaceKey, selectionKey, scopeKey, data,
    isPending: mutation.isPending,
    optionsLoading: !optionsUnavailable && !data,
    optionsError: optionsUnavailable ? targets.error?.message || "Select between 1 and 100 available enrollments in the current workspace." : null,
    error: failure?.scopeKey === scopeKey ? failure.message : data && options.classroomDepartmentId && !targetAvailable
      ? "The selected destination is no longer available. Choose a current class." : null,
    canRefresh: identityReady && validSelection && !targets.isFetching && !mutation.isPending,
    refresh: () => { if (identityReady && validSelection) void targets.refetch(); },
    submit: () => { void submit(); },
  };
}
