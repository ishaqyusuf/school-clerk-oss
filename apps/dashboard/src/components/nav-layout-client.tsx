"use client";
import { switchSessionTerm } from "@/actions/cookies/auth-cookie";
import { _trpc } from "@/components/static-trpc";
import { resolveDashboardNavigation } from "@/features/navigation/dashboard-navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { ModuleAccessNotice } from "./settings/module-access-notice";
import type { ModuleId } from "@school-clerk/utils/module-config";
import { createSiteNavContext, SiteNav } from "@school-clerk/site-nav";
import { Icons } from "@school-clerk/ui/custom/icons";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { TenantLink } from "@school-clerk/tenant-url/next";
import { useLocalTenantHref, useTenantUrl } from "@school-clerk/tenant-url/react";
import { ChatWidget } from "./chat/chat-widget";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import {
  AcademicDataDirectionProvider,
  type DataDirection,
} from "./academic-data-direction/provider";

const NO_MODULES: readonly ModuleId[] = [];

export function NavLayoutClient({
  children,
  initialRole,
  academicDataDirection,
  schoolId,
}: {
  children: React.ReactNode;
  initialRole?: string | null;
  academicDataDirection: DataDirection;
  schoolId: string;
}) {
  const auth = useAuth();
  const trpc = useTRPC();
  const moduleQuery = useQuery(trpc.schoolSettings.getModules.queryOptions({ schoolId }));
  const moduleAccess = moduleQuery.data?.access;
  // Missing, invalid and failed configuration reads do not grant navigation.
  // Settings and account recovery remain outside module-specific policies.
  const tenantModules = moduleQuery.isError
    ? NO_MODULES
    : moduleAccess?.effectiveModules ?? NO_MODULES;
  const pathName = usePathname();
  const tenantUrl = useTenantUrl();
  const tenantHref = useLocalTenantHref();
  const productPathName = tenantUrl?.context.productPath ?? pathName;
  const navigationRole = auth.role ?? initialRole;
  const navigation = useMemo(
    () => resolveDashboardNavigation(navigationRole, {
      tenantModules,
      institutionType: moduleQuery.data?.institutionType,
    }),
    [navigationRole, tenantModules, moduleQuery.data?.institutionType],
  );
  const canUseChat =
    process.env.NODE_ENV !== "production" && initialRole === "Admin" &&
    tenantModules.includes("AI_ASSISTANT");
  const onLogout = () => {
    window.location.href = tenantHref("/signout");
  };

  return (
    <AcademicDataDirectionProvider direction={academicDataDirection}>
      <SiteNav.Provider
      value={createSiteNavContext({
        pathName: productPathName,
        navigation,
        Link: TenantLink,
        mobileSidebarLogo: <Icons.LogoLg />,
        mobileSidebarFooter: (
          <SidebarUserMenu
            auth={auth}
            dropdownSide="top"
            expanded
            onLogout={onLogout}
          />
        ),
      })}
    >
      <div className="relative ">
        <SiteNav.Sidebar>
          <div className="absolute bottom-4 left-0 right-0 z-10 px-2 w-full flex items-center justify-center md:justify-start md:px-2">
            <SidebarUserMenu
              auth={auth}
              onLogout={onLogout}
            />
          </div>
        </SiteNav.Sidebar>
        <SiteNav.Shell className="pb-8">
          <WorkspaceTermBootstrap enabled={tenantModules.includes("ACADEMIC_PROGRAMS")} />
          <Header />
          <div className="min-w-0 px-2 sm:px-6">
            <ModuleAccessNotice
              status={moduleQuery.isError ? "error" : moduleAccess?.status ?? "loading"}
              canManage={navigationRole === "Admin" || navigationRole === "ADMIN"}
              isFetching={moduleQuery.isFetching}
              onRetry={() => { void moduleQuery.refetch(); }}
            />
            {children}
          </div>
        </SiteNav.Shell>
        {canUseChat ? <ChatWidget /> : null}
      </div>
      </SiteNav.Provider>
    </AcademicDataDirectionProvider>
  );
}

function WorkspaceTermBootstrap({ enabled }: { enabled: boolean }) {
  const auth = useAuth();
  const didSwitchTerm = useRef(false);
  const shouldSelectTerm = enabled && !!auth.profile?.schoolId && !auth.profile?.termId;
  const { data: dashboardData } = useQuery(
    _trpc.academics.dashboard.queryOptions(
      {},
      {
        enabled: shouldSelectTerm,
      },
    ),
  );

  useEffect(() => {
    if (!shouldSelectTerm || didSwitchTerm.current) return;

    const currentSession = dashboardData?.sessions?.find(
      (session) => session.currentTerm,
    );
    const currentTerm = currentSession?.currentTerm;

    if (!currentSession || !currentTerm) return;

    didSwitchTerm.current = true;
    switchSessionTerm({
      termId: currentTerm.id,
      termTitle: currentTerm.title,
      sessionId: currentSession.id,
      sessionTitle: currentSession.name,
    })
      .then(() => {
        window.location.reload();
      })
      .catch(() => {
        didSwitchTerm.current = false;
      });
  }, [dashboardData?.sessions, shouldSelectTerm]);

  return null;
}

function SidebarUserMenu({
  auth,
  onLogout,
  expanded,
  dropdownSide,
}: {
  auth: ReturnType<typeof useAuth>;
  onLogout: () => void;
  expanded?: boolean;
  dropdownSide?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <SiteNav.User
      user={auth}
      onLogout={onLogout}
      expanded={expanded}
      dropdownSide={dropdownSide}
    />
  );
}
