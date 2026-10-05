"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteStudentInput } from "@school-clerk/utils/student-delete-schema";
import { useTRPC } from "@/trpc/client";
import { useAuth } from "./use-auth";

function deletionKey(input: DeleteStudentInput) {
  return JSON.stringify([input.studentId, input.viewScope?.schoolId, input.viewScope?.userId, input.viewScope?.loginSessionId]);
}

export function useDeleteStudent(studentId: string | undefined, onSuccess?: () => void) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const input = { studentId: studentId || "", viewScope: {
    schoolId: auth.profile?.schoolId || "", userId: auth.id || "", loginSessionId: auth.sessionId || "",
  } };
  const ready = !!studentId && !auth.isPending && !auth.isProfileLoading && !auth.isProfileError &&
    !!input.viewScope.schoolId && !!input.viewScope.userId && !!input.viewScope.loginSessionId &&
    auth.profile?.auth?.userId === input.viewScope.userId && ["ADMIN", "REGISTRAR"].includes(auth.role?.toUpperCase() ?? "");
  const scopeKey = deletionKey(input);
  const current = useRef({ scopeKey, ready, onSuccess });
  current.current = { scopeKey, ready, onSuccess };
  const mounted = useRef(true);
  const submitting = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const mutation = useMutation(trpc.students.deleteStudent.mutationOptions({
    retry: false,
    // Fail an offline request now instead of silently queueing a destructive
    // mutation for a later connection/workspace.
    networkMode: "always",
    onSuccess(_result, variables) {
      void queryClient.invalidateQueries({ queryKey: trpc.students.index.infiniteQueryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.students.analytics.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.students.duplicateGroups.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.students.classChangeOptions.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.students.overview.queryKey({ studentId: variables.studentId }) });
      void queryClient.invalidateQueries({ queryKey: trpc.students.academicsOverview.queryKey({ studentId: variables.studentId }) });
      void queryClient.invalidateQueries({ queryKey: trpc.academics.getStudentTermsList.queryKey({ studentId: variables.studentId }) });
      void queryClient.invalidateQueries({ queryKey: trpc.classrooms.getCurrentSessionClassroom.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.classrooms.getClassroomsForSession.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.search.global.queryKey() });
      if (mounted.current && current.current.ready && current.current.scopeKey === deletionKey(variables)) {
        current.current.onSuccess?.();
      }
    },
  }));

  const matches = mutation.variables && deletionKey(mutation.variables) === scopeKey;
  return {
    scopeKey, ready, isPending: mutation.isPending,
    error: matches && mutation.error ? mutation.error.message : null,
    async submit() {
      if (!ready || submitting.current) return false;
      submitting.current = true;
      try {
        await mutation.mutateAsync(input);
        return mounted.current && current.current.ready && current.current.scopeKey === scopeKey;
      } catch {
        // Keep the confirmation visible; the current-scope error is shown by its caller.
        return false;
      } finally {
        submitting.current = false;
      }
    },
  };
}
