"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useAuth } from "./use-auth";

export function useStudentTermDetails(id: string | null) {
  const trpc = useTRPC();
  const auth = useAuth();
  const identity = {
    schoolId: auth.profile?.schoolId || "",
    userId: auth.id || "",
    loginSessionId: auth.sessionId || "",
  };
  const identityReady = !auth.isPending && !auth.isProfileLoading && !auth.isProfileError &&
    !!identity.schoolId && !!identity.userId && !!identity.loginSessionId &&
    auth.profile?.auth?.userId === identity.userId && ["ADMIN", "REGISTRAR"].includes(auth.role?.toUpperCase() ?? "");
  const modules = useQuery({
    ...trpc.schoolSettings.getModules.queryOptions({ schoolId: identity.schoolId }),
    enabled: identityReady && !!id, retry: false, staleTime: 0,
    refetchOnMount: "always", refetchOnWindowFocus: "always", refetchOnReconnect: "always",
  });
  const configuration = modules.data?.access.config;
  const policyReady = modules.isSuccess && modules.fetchStatus === "idle" && !modules.isPlaceholderData &&
    modules.data?.schoolId === identity.schoolId && !!configuration;
  const role: "ADMIN" | "REGISTRAR" = auth.role?.toUpperCase() === "ADMIN" ? "ADMIN" : "REGISTRAR";
  const scope = { ...identity, role, moduleRevision: configuration?.revision ?? 0 };
  const ready = identityReady && policyReady;
  const query = useQuery({
    ...trpc.students.getTermFormDetails.queryOptions({ id: id || "", viewScope: scope }),
    enabled: ready && !!id, retry: false, staleTime: 0, gcTime: 0,
    refetchOnMount: "always", refetchOnWindowFocus: "always", refetchOnReconnect: "always",
  });
  const candidate = query.data;
  const matches = candidate?.id === id && candidate?.scope.schoolId === scope.schoolId &&
    candidate?.scope.userId === scope.userId && candidate?.scope.loginSessionId === scope.loginSessionId &&
    candidate?.scope.role === role && candidate?.scope.moduleRevision === scope.moduleRevision;
  const isUnavailable = !!id && (auth.isProfileError ||
    (!auth.isPending && !auth.isProfileLoading && !identityReady) || modules.isError ||
    modules.fetchStatus === "paused" || (modules.isSuccess && !modules.isFetching && !policyReady) || query.isError ||
    query.fetchStatus === "paused" || (query.isSuccess && !query.isFetching && !matches));
  const data = ready && id && matches && query.isSuccess && query.fetchStatus === "idle" &&
    !query.isPlaceholderData && !isUnavailable ? candidate : undefined;
  return {
    data, isUnavailable, isLoading: !!id && !data && !isUnavailable,
    canRetry: identityReady && !!id && !modules.isFetching && !query.isFetching,
    refresh: async () => {
      if (!identityReady || !id) return;
      const refreshed = await modules.refetch();
      // A changed revision selects a new preview key on the next render.
      if (refreshed.isSuccess && refreshed.data.access.config?.revision === scope.moduleRevision) {
        await query.refetch();
      }
    },
  };
}
