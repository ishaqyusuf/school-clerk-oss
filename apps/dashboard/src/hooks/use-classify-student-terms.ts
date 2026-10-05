"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { RouterOutputs } from "@school-clerk/api/trpc/routers/_app";
import { bulkSetStudentAdmissionTypeSchema, type BulkSetStudentAdmissionTypeInput } from "@school-clerk/utils/student-admission-type-schema";
import { useTRPC } from "@/trpc/client";
import { useAuth } from "./use-auth";
import { invalidateStudentFinanceQueries } from "./invalidate-student-finance";

type ClassificationResult = RouterOutputs["students"]["bulkSetAdmissionType"];
type Options = {
  studentTermFormIds: string[];
  admissionType: BulkSetStudentAdmissionTypeInput["admissionType"];
  contextKey: string;
  selectionAvailable: boolean;
  onSuccess?: (result: ClassificationResult) => void;
};

export function useClassifyStudentTerms(options: Options) {
  const auth = useAuth();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const viewScope = { schoolId: auth.profile?.schoolId || "", userId: auth.id || "", loginSessionId: auth.sessionId || "" };
  const identityReady = !auth.isPending && !auth.isProfileLoading && !auth.isProfileError &&
    !!viewScope.schoolId && !!viewScope.userId && !!viewScope.loginSessionId &&
    auth.profile?.auth?.userId === viewScope.userId && ["ADMIN", "REGISTRAR"].includes(auth.role?.toUpperCase() ?? "");
  const input = { studentTermFormIds: options.studentTermFormIds.map((id) => id.trim()).sort(), admissionType: options.admissionType, viewScope };
  const ready = identityReady && options.selectionAvailable && bulkSetStudentAdmissionTypeSchema.safeParse(input).success;
  const selectionKey = JSON.stringify([viewScope, auth.role, auth.profile?.sessionId, auth.profile?.termId,
    input.studentTermFormIds, options.contextKey, options.selectionAvailable]);
  const scopeKey = JSON.stringify([selectionKey, options.admissionType]);
  const current = useRef({ scopeKey, identityReady, options });
  current.current = { scopeKey, identityReady, options };
  const mounted = useRef(true);
  const activeRequest = useRef(false);
  const [failure, setFailure] = useState<{ scopeKey: string; message: string } | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const mutation = useMutation(trpc.students.bulkSetAdmissionType.mutationOptions({
    retry: false, networkMode: "always",
    onSuccess(result) {
      invalidateStudentFinanceQueries(queryClient, trpc, result);
    },
  }));

  async function submit() {
    if (activeRequest.current || !mounted.current || current.current.scopeKey !== scopeKey) return;
    activeRequest.current = true;
    setFailure(null);
    let committed = false;
    try {
      if (!ready) throw new Error("Select between 1 and 100 available enrollments in your current workspace. No partial selection will be submitted.");
      const result = await mutation.mutateAsync(bulkSetStudentAdmissionTypeSchema.parse(input));
      committed = true;
      if (mounted.current && current.current.identityReady && current.current.scopeKey === scopeKey) {
        current.current.options.onSuccess?.(result);
      }
    } catch (error) {
      if (!committed && mounted.current && current.current.scopeKey === scopeKey) {
        setFailure({ scopeKey, message: error instanceof Error ? error.message : "Classification could not be completed. Refresh to check statuses and fees before retrying." });
      }
    } finally {
      activeRequest.current = false;
    }
  }

  return { ready, selectionKey, isPending: mutation.isPending,
    error: failure?.scopeKey === scopeKey ? failure.message : null, submit };
}
