"use client";
import { switchSessionTerm } from "@/actions/cookies/auth-cookie";
import { _trpc } from "@/components/static-trpc";
import { useAuth } from "@/hooks/use-auth";
import { createSiteNavContext, SiteNav } from "@school-clerk/site-nav";
import { Icons } from "@school-clerk/ui/custom/icons";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { linkModules } from "./sidebar/links";
import { TenantLink } from "@school-clerk/tenant-url/next";
import { useLocalTenantHref, useTenantUrl } from "@school-clerk/tenant-url/react";
import { ChatWidget } from "./chat/chat-widget";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function NavLayoutClient({
  children,
  initialRole,
}: {
  children: React.ReactNode;
  initialRole?: string | null;
}) {
  const auth = useAuth();
  const pathName = usePathname();
  const tenantUrl = useTenantUrl();
  const tenantHref = useLocalTenantHref();
  const productPathName = tenantUrl?.context.productPath ?? pathName;
  const canUseChat = initialRole === "Admin";
  const onLogout = () => {
    window.location.href = tenantHref("/signout");
  };

  return (
    <SiteNav.Provider
      value={createSiteNavContext({
        pathName: productPathName,
        linkModules,
        Link: TenantLink,
        role: auth.role,
        userId: auth.id,
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
          <SiteNav.Logo Icon={Icons.LogoLg} />
          <SiteNav.LogoSm Icon={Icons.Logo} />
          {/* <TermSwitcher /> */}
          {/* <ModuleSwitcher /> */}
          <div className="absolute bottom-4 left-0 right-0 z-10 px-2 w-full flex items-center justify-center md:justify-start md:px-2">
            <SidebarUserMenu
              auth={auth}
              onLogout={onLogout}
            />
          </div>
        </SiteNav.Sidebar>
        <SiteNav.Shell className="pb-8">
          <WorkspaceTermBootstrap />
          <Header />
          <div className="px-2 sm:px-6">{children}</div>
        </SiteNav.Shell>
        {canUseChat ? <ChatWidget /> : null}
      </div>
    </SiteNav.Provider>
  );
}

function WorkspaceTermBootstrap() {
  const auth = useAuth();
  const didSwitchTerm = useRef(false);
  const shouldSelectTerm = !!auth.profile?.schoolId && !auth.profile?.termId;
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
// export function NavLayoutClient({ children }) {
//   const auth = useAuth({
//     required: true,
//   });
//   const pathName = usePathname();
//   return (
//     <SiteNav.Provider
//       value={createSiteNavContext({
//         pathName,
//         linkModules,
//         Link,
//         role: auth.role,
//         userId: auth.id,
//       })}
//     >
//       <div className="relative">
//         <SiteNav.Sidebar>
//           <TermSwitcher />
//           {/* <ModuleSwitcher /> */}
//         </SiteNav.Sidebar>
//         <SiteNav.Shell className="pb-8">
//           <Header />
//           <div className="px-6">{children}</div>
//         </SiteNav.Shell>
//       </div>
//     </SiteNav.Provider>
//   );
// }
