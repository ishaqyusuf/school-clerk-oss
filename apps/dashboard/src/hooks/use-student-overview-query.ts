"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export function useStudentOverviewQuery(studentId: string | null) {
  const auth = useAuth();
  const trpc = useTRPC();
  const identity = {
    schoolId: auth.profile?.schoolId || "",
    userId: auth.id || "",
    loginSessionId: auth.sessionId || "",
  };
  const ready = !auth.isPending && !auth.isProfileLoading && !auth.isProfileError &&
    !!identity.schoolId && !!identity.userId && !!identity.loginSessionId &&
    auth.profile?.auth?.userId === identity.userId;
  const options = trpc.students.overview.queryOptions({ studentId: studentId || "", viewScope: identity });
  const query = useQuery({
    ...options,
    enabled: ready && !!studentId,
    staleTime: 0, gcTime: 0,
    // Automatic background refresh would unmount and discard an active editor.
    // Mount, explicit refresh and mutation invalidation reauthorize this read.
    refetchOnMount: "always", refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  const candidate = query.data;
  const matches = candidate?.student.id === studentId && candidate?.scope?.schoolId === identity.schoolId &&
    candidate?.scope?.userId === identity.userId && candidate?.scope?.loginSessionId === identity.loginSessionId;
  const unavailable = auth.isProfileError || (!auth.isPending && !auth.isProfileLoading && !ready) ||
    query.isError || query.fetchStatus === "paused" || (query.isSuccess && !query.isFetching && !matches);
  const data = ready && studentId && matches && query.isSuccess && !query.isPlaceholderData &&
    query.fetchStatus === "idle" && !unavailable ? candidate : undefined;
  return {
    data,
    isLoading: !!studentId && !unavailable && !data,
    isUnavailable: !!studentId && unavailable,
    refetch: () => { if (ready && studentId) void query.refetch(); },
  };
}
