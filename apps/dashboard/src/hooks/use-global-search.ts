"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "./use-auth";

export function useGlobalSearch(query: string) {
  const auth = useAuth();
  const trpc = useTRPC();
  const identity = {
    schoolId: auth.profile?.schoolId || "",
    userId: auth.id || "",
    loginSessionId: auth.sessionId || "",
    sessionId: auth.profile?.sessionId || null,
  };
  const ready = !auth.isPending && !auth.isProfileLoading && !auth.isProfileError &&
    !!identity.schoolId && !!identity.userId && !!identity.loginSessionId &&
    auth.profile?.auth?.userId === identity.userId;
  const scopeQuery = useQuery(trpc.search.scope.queryOptions(identity, {
    enabled: ready, staleTime: 0, gcTime: 0,
    refetchOnMount: "always", refetchOnWindowFocus: "always", refetchInterval: 30_000,
  }));
  const candidate = scopeQuery.data;
  const scope = ready && scopeQuery.isSuccess && !scopeQuery.isPlaceholderData &&
    scopeQuery.fetchStatus === "idle" && candidate?.schoolId === identity.schoolId &&
    candidate.userId === identity.userId && candidate.loginSessionId === identity.loginSessionId &&
    candidate.sessionId === identity.sessionId ? candidate : undefined;
  const recordsQuery = useQuery(trpc.search.global.queryOptions({
    ...identity, accessKey: scope?.accessKey || "unavailable", query, limit: 10,
  }, {
    enabled: !!scope && query.length >= 2, staleTime: 0, gcTime: 0,
    refetchOnMount: "always", refetchOnWindowFocus: "always",
  }));
  const { refetch: refreshScope } = scopeQuery;
  const conflict = recordsQuery.error?.data?.code === "CONFLICT";
  useEffect(() => {
    if (conflict && ready) void refreshScope();
  }, [conflict, ready, refreshScope]);

  const error = auth.isProfileError || (!auth.isPending && !auth.isProfileLoading && !ready) ||
    scopeQuery.isError || scopeQuery.fetchStatus === "paused" ||
    (!!scope && query.length >= 2 && (recordsQuery.isError || recordsQuery.fetchStatus === "paused"));
  const pending = !error && (!scope || (query.length >= 2 &&
    (recordsQuery.isPending || recordsQuery.isFetching)));
  const records = scope && query.length >= 2 && recordsQuery.isSuccess &&
    !recordsQuery.isPlaceholderData && recordsQuery.fetchStatus === "idle" ? recordsQuery.data : [];

  async function retry() {
    if (!ready) return;
    const refreshed = await refreshScope();
    // A changed policy selects a fresh query key on the next render.
    if (refreshed.isSuccess && refreshed.data?.accessKey === scope?.accessKey && query.length >= 2) {
      await recordsQuery.refetch();
    }
  }

  return { scope: error ? undefined : scope, records: error ? [] : records, pending, error, retry };
}
