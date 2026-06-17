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
import { useTenantUrl } from "@school-clerk/tenant-url/react";
import { ChatWidget } from "./chat/chat-widget";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuItem,
  DropdownMenuPortal,
} from "@school-clerk/ui/dropdown-menu";
import { KeyRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function NavLayoutClient({
  children,
  devUsers = [],
}: {
  children: React.ReactNode;
  devUsers?: any[];
}) {
  const auth = useAuth();
  const pathName = usePathname();
  const tenantUrl = useTenantUrl();
  const productPathName = tenantUrl?.context.productPath ?? pathName;
  const onLogout = () => {
    window.location.href = "/signout";
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
            devUsers={devUsers}
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
              devUsers={devUsers}
              onLogout={onLogout}
            />
          </div>
        </SiteNav.Sidebar>
        <SiteNav.Shell className="pb-8">
          <WorkspaceTermBootstrap />
          <Header />
          <div className="px-6">{children}</div>
        </SiteNav.Shell>
        <ChatWidget />
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
  devUsers,
  onLogout,
  expanded,
  dropdownSide,
}: {
  auth: ReturnType<typeof useAuth>;
  devUsers: any[];
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
    >
      {devUsers.length > 0 && (
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <KeyRound className="h-4 w-4" />
            Quick Login
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {devUsers.map((user) => (
                <DropdownMenuItem key={user.email} asChild>
                  <a
                    href={user.quickLoginHref}
                    className="flex flex-col items-start gap-1 p-2"
                  >
                    <span className="font-medium leading-none">
                      {user.name || user.email}
                    </span>
                    <span className="text-xs leading-none text-muted-foreground capitalize">
                      {user.role}
                    </span>
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      )}
    </SiteNav.User>
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
