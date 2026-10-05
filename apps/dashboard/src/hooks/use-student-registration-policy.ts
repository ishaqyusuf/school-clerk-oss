"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useAuth } from "./use-auth";

export function useStudentRegistrationPolicy() {
  const auth = useAuth();
  const trpc = useTRPC();
  const schoolId = auth.profile?.schoolId || "";
  const identityReady = !auth.isPending && !auth.isProfileLoading && !auth.isProfileError &&
    !!schoolId && !!auth.id && !!auth.sessionId && auth.profile?.auth?.userId === auth.id;
  const query = useQuery({
    ...trpc.schoolSettings.getModules.queryOptions({ schoolId }),
    enabled: identityReady,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
  const ready = identityReady && query.isSuccess && !query.isPlaceholderData &&
    query.fetchStatus === "idle" && query.data.schoolId === schoolId && query.data.access.status === "configured";
  return {
    ready,
    billingEnabled: ready && query.data.access.effectiveModules.includes("BILLING_FINANCE"),
    isError: query.isError || (query.isSuccess && query.data.access.status !== "configured"),
  };
}
