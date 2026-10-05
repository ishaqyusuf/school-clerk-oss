"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RouterOutputs } from "@school-clerk/api/trpc/routers/_app";
import { bulkDeleteTermSheetsSchema } from "@school-clerk/utils/student-delete-schema";
import { useTRPC } from "@/trpc/client";
import { useAuth } from "./use-auth";

type RemovalResult = RouterOutputs["students"]["bulkDeleteTermSheets"];
type RemovalSelection = { id: string } | { ids: string[] };
type Options = {
  contextKey: string;
  onSuccess?: (result: RemovalResult, selection: { ids: string[] }) => void;
  onError?: (error: Error) => void;
};

export function useRemoveStudentTerms(options: Options) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const viewScope = { schoolId: auth.profile?.schoolId || "", userId: auth.id || "", loginSessionId: auth.sessionId || "" };
  const ready = !auth.isPending && !auth.isProfileLoading && !auth.isProfileError &&
    !!viewScope.schoolId && !!viewScope.userId && !!viewScope.loginSessionId && auth.profile?.auth?.userId === viewScope.userId &&
    ["ADMIN", "REGISTRAR"].includes(auth.role?.toUpperCase() ?? "");
  const workspaceKey = JSON.stringify([viewScope.schoolId, viewScope.userId, viewScope.loginSessionId, auth.profile?.sessionId, auth.profile?.termId]);
  const scopeKey = JSON.stringify([workspaceKey, options.contextKey]);
  const current = useRef({ scopeKey, ready, options });
  current.current = { scopeKey, ready, options };
  const mounted = useRef(true);
  const activeRequest = useRef<string | null>(null);
  const [failure, setFailure] = useState<{ scopeKey: string; error: Error } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const mutation = useMutation(trpc.students.bulkDeleteTermSheets.mutationOptions({
    retry: false, networkMode: "always",
    onSuccess(result, variables) {
      void queryClient.invalidateQueries({ queryKey: trpc.students.index.infiniteQueryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.students.analytics.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.students.duplicateGroups.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.students.classChangeOptions.queryKey() });
      for (const studentId of result.studentIds) {
        void queryClient.invalidateQueries({ queryKey: trpc.students.overview.queryKey({ studentId }) });
        void queryClient.invalidateQueries({ queryKey: trpc.students.academicsOverview.queryKey({ studentId }) });
        void queryClient.invalidateQueries({ queryKey: trpc.academics.getStudentTermsList.queryKey({ studentId }) });
      }
      for (const id of variables.ids) {
        void queryClient.invalidateQueries({ queryKey: trpc.students.getTermFormDetails.queryKey({ id }) });
      }
      void queryClient.invalidateQueries({ queryKey: trpc.classrooms.all.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.classrooms.getCurrentSessionClassroom.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.classrooms.getClassroomsForSession.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.academics.getPromotionStudents.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.assessments.getClassroomReportSheet.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.assessments.getPrintStatus.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.search.global.queryKey() });
      if (mounted.current && current.current.ready && activeRequest.current === current.current.scopeKey) {
        current.current.options.onSuccess?.(result, { ids: variables.ids });
      }
    },
  }));

  async function mutateAsync(selection: RemovalSelection) {
    if (activeRequest.current !== null) throw new Error("An enrollment removal is already in progress.");
    if (!mounted.current || current.current.scopeKey !== scopeKey) throw new Error("The removal selection changed. Reopen its confirmation.");
    activeRequest.current = scopeKey;
    setFailure(null);
    let completed = false;
    try {
      if (!ready) throw new Error("Your enrollment workspace is unavailable. Refresh before removing records.");
      const parsed = bulkDeleteTermSheetsSchema.safeParse({ ids: "id" in selection ? [selection.id] : selection.ids, viewScope });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Review the selected enrollment records.");
      const result = await mutation.mutateAsync(parsed.data);
      completed = true;
      if (!mounted.current || !current.current.ready || current.current.scopeKey !== scopeKey) {
        throw new Error("The originating removal view changed. Refresh to see current records.");
      }
      return result;
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error("Enrollment removal could not be completed. Refresh to check the records.");
      if (!completed && mounted.current && current.current.scopeKey === scopeKey) {
        setFailure({ scopeKey, error });
        current.current.options.onError?.(error);
      }
      throw error;
    } finally {
      activeRequest.current = null;
    }
  }

  return {
    ready, scopeKey, workspaceKey, isPending: mutation.isPending,
    error: failure?.scopeKey === scopeKey ? failure.error : null,
    mutateAsync,
    mutate: (selection: RemovalSelection) => { void mutateAsync(selection).catch(() => undefined); },
  };
}
