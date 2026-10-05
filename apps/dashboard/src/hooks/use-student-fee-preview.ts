"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

type FeePreviewInput = {
  sessionTermId: string;
  classroomDepartmentId: string | null;
  admissionType: "UNCLASSIFIED" | "NEW_ADMISSION" | "RETURNING";
  studentGender: "Male" | "Female";
};

export function useStudentFeePreview(input: FeePreviewInput, enabled = true) {
  const trpc = useTRPC();
  const auth = useAuth();
  const viewScope = { schoolId: auth.profile?.schoolId || "", userId: auth.id || "", loginSessionId: auth.sessionId || "" };
  const ready = !auth.isPending && !auth.isProfileLoading && !auth.isProfileError &&
    !!viewScope.schoolId && !!viewScope.userId && !!viewScope.loginSessionId &&
    auth.profile?.auth?.userId === viewScope.userId;
  const active = enabled && !!input.sessionTermId && !!input.classroomDepartmentId;
  const query = useQuery(trpc.academics.previewApplicableFeeHistories.queryOptions({ ...input, viewScope }, {
    enabled: active && ready, staleTime: 0, gcTime: 0,
    refetchOnMount: "always", refetchOnWindowFocus: false, refetchOnReconnect: false,
  }));
  const isError = active && (auth.isProfileError || (!auth.isPending && !auth.isProfileLoading && !ready) ||
    query.isError || query.fetchStatus === "paused");
  const data = active && ready && !isError && query.isSuccess && !query.isPlaceholderData &&
    query.fetchStatus === "idle" ? query.data : undefined;
  return { data, isError, isLoading: active && !isError && !data,
    retry: () => { if (active && ready) void query.refetch(); } };
}
