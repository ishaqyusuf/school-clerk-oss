"use client";

import { useNotificationScope, type NotificationScope } from "@/components/notifications/notification-scope-provider";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const unavailableScope: NotificationScope = { schoolId: "", userId: "", accessKey: "" };
const privateQueryOptions = {
  staleTime: 0,
  gcTime: 0,
  retry: false,
  refetchOnMount: "always",
  refetchOnWindowFocus: "always",
  placeholderData: undefined,
} as const;

export function useNotificationFeed(take: number, onlyUnread: boolean) {
  const { scope, pending } = useNotificationScope();
  const trpc = useTRPC();
  const query = useQuery(trpc.notifications.list.queryOptions({
    ...(scope ?? unavailableScope), take, onlyUnread,
  }, { ...privateQueryOptions, enabled: !!scope }));
  return {
    notifications: scope && query.isSuccess && query.fetchStatus === "idle" ? query.data : [],
    isPending: pending || (!!scope && (query.isPending || query.isFetching)),
    isError: (!scope && !pending) || query.isError || query.fetchStatus === "paused",
    // Reload both workspace/session context and feed after an access mismatch.
    refetch: () => window.location.reload(),
  };
}

export function useNotificationUnreadCount() {
  const { scope, pending } = useNotificationScope();
  const trpc = useTRPC();
  const query = useQuery(trpc.notifications.unreadCount.queryOptions(
    scope ?? unavailableScope, { ...privateQueryOptions, enabled: !!scope },
  ));
  return {
    unreadCount: scope && query.isSuccess && query.fetchStatus === "idle" ? query.data : 0,
    isError: (!scope && !pending) || query.isError || query.fetchStatus === "paused",
  };
}

export function useNotificationReadActions() {
  const { scope } = useNotificationScope();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const invalidate = ({ schoolId, userId, accessKey }: NotificationScope) => {
    const submittedScope = { schoolId, userId, accessKey };
    return Promise.all([
      qc.invalidateQueries({ queryKey: trpc.notifications.list.queryKey(submittedScope) }),
      qc.invalidateQueries({ queryKey: trpc.notifications.unreadCount.queryKey(submittedScope), exact: true }),
    ]);
  };
  const markRead = useMutation(trpc.notifications.markRead.mutationOptions({
    retry: false,
    onSettled: (_data, _error, submitted) => invalidate(submitted),
  }));
  const markAllRead = useMutation(trpc.notifications.markAllRead.mutationOptions({
    retry: false,
    onSettled: (_data, _error, submitted) => invalidate(submitted),
  }));
  return {
    markRead: ({ notificationId }: { notificationId: string }) => {
      if (scope && !markRead.isPending && !markAllRead.isPending) markRead.mutate({ ...scope, notificationId });
    },
    markAllRead: () => {
      if (scope && !markRead.isPending && !markAllRead.isPending) markAllRead.mutate(scope);
    },
    markReadPending: markRead.isPending,
    markAllPending: markAllRead.isPending,
    markReadError: markRead.isError,
    markAllError: markAllRead.isError,
  };
}
