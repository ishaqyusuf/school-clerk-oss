"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RouterOutputs } from "@school-clerk/api/trpc/routers/_app";
import { studentProfileUpdateSchema, type UpdateStudentBasicProfileInput, type ChangeStudentGenderInput } from "@school-clerk/utils/student-profile-schema";
import { useTRPC } from "@/trpc/client";
import { useAuth } from "./use-auth";
import { invalidateStudentFinanceQueries } from "./invalidate-student-finance";

type Result = RouterOutputs["students"]["updateStudentBasicProfile"];
type Selection = Pick<UpdateStudentBasicProfileInput, "data"> | Pick<ChangeStudentGenderInput, "gender">;
type Options = { studentId: string; contextKey: string; onSuccess?: (result: Result) => void };

export function useUpdateStudentProfile(options: Options) {
  const auth = useAuth();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const viewScope = { schoolId: auth.profile?.schoolId || "", userId: auth.id || "", loginSessionId: auth.sessionId || "" };
  const ready = !auth.isPending && !auth.isProfileLoading && !auth.isProfileError && !!options.studentId &&
    !!viewScope.schoolId && !!viewScope.userId && !!viewScope.loginSessionId &&
    auth.profile?.auth?.userId === viewScope.userId && ["ADMIN", "REGISTRAR"].includes(auth.role?.toUpperCase() ?? "");
  const scopeKey = JSON.stringify([viewScope, auth.role, auth.profile?.sessionId, auth.profile?.termId, options.studentId, options.contextKey]);
  const current = useRef({ scopeKey, ready, options });
  current.current = { scopeKey, ready, options };
  const mounted = useRef(true);
  const activeRequest = useRef(false);
  const [failure, setFailure] = useState<{ scopeKey: string; message: string } | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  function invalidate(result: Result) {
    invalidateStudentFinanceQueries(queryClient, trpc, { studentIds: [result.studentId],
      termFormIds: [...result.reconciliation.map((row) => row.studentTermFormId), ...result.preservedTermFormIds] });
  }
  const profileMutation = useMutation(trpc.students.updateStudentBasicProfile.mutationOptions({ retry: false, networkMode: "always", onSuccess: invalidate }));
  const genderMutation = useMutation(trpc.students.changeGender.mutationOptions({ retry: false, networkMode: "always", onSuccess: invalidate }));

  async function save(selection: Selection) {
    if (activeRequest.current || !mounted.current || current.current.scopeKey !== scopeKey) return;
    activeRequest.current = true;
    setFailure(null);
    let committed = false;
    try {
      if (!ready) throw new Error("Your student workspace is unavailable. Reopen the editor before saving.");
      const data = studentProfileUpdateSchema.parse({ ...selection, id: options.studentId, viewScope });
      const result = "data" in data ? await profileMutation.mutateAsync(data) : await genderMutation.mutateAsync(data);
      committed = true;
      if (mounted.current && current.current.ready && current.current.scopeKey === scopeKey) current.current.options.onSuccess?.(result);
    } catch (error) {
      if (!committed && mounted.current && current.current.scopeKey === scopeKey) setFailure({ scopeKey,
        message: error instanceof Error ? error.message : "Student update could not be completed. Refresh to check the profile and fees before retrying." });
    } finally { activeRequest.current = false; }
  }
  return { ready, save, isPending: profileMutation.isPending || genderMutation.isPending,
    error: failure?.scopeKey === scopeKey ? failure.message : null };
}
