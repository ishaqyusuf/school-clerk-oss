"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { getReadableSchoolNotificationTypes } from "@school-clerk/notifications/module-policy";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";

export type NotificationScope = { schoolId: string; userId: string; accessKey: string };
const NotificationScopeContext = createContext<{ scope: NotificationScope | null; pending: boolean }>({ scope: null, pending: false });

export function NotificationScopeProvider({ schoolId, userId, children }: {
  schoolId: string; userId: string | null; children: ReactNode;
}) {
  const auth = useAuth();
  const trpc = useTRPC();
  const modules = useQuery(trpc.schoolSettings.getModules.queryOptions({ schoolId }));
  const pending = auth.isPending || auth.isProfileLoading || modules.isPending || modules.isFetching;
  const ready = !pending && !auth.isProfileError && auth.id === userId &&
    auth.profile?.schoolId === schoolId && modules.isSuccess && !modules.isError;
  const scope = userId && ready && modules.data ? {
    schoolId,
    userId,
    accessKey: JSON.stringify(getReadableSchoolNotificationTypes(modules.data.access, auth.role ?? null)),
  } : null;

  return <NotificationScopeContext.Provider value={{ scope, pending }}>{children}</NotificationScopeContext.Provider>;
}

export function useNotificationScope() {
  return useContext(NotificationScopeContext);
}
