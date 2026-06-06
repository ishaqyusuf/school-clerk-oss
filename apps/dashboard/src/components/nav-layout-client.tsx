"use client";
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

export function NavLayoutClient({ children, devUsers = [] }: { children: React.ReactNode, devUsers?: any[] }) {
  const auth = useAuth();
  const pathName = usePathname();
  const tenantUrl = useTenantUrl();
  const productPathName = tenantUrl?.context.productPath ?? pathName;
  return (
    <SiteNav.Provider
      value={createSiteNavContext({
        pathName: productPathName,
        linkModules,
        Link: TenantLink,
        role: auth.role,
        userId: auth.id,
      })}
    >
      <div className="relative ">
        <SiteNav.Sidebar>
          <SiteNav.Logo Icon={Icons.LogoLg} />
          <SiteNav.LogoSm Icon={Icons.Logo} />
          {/* <TermSwitcher /> */}
          {/* <ModuleSwitcher /> */}
          <div className="absolute bottom-4 left-0 right-0 z-10 px-2 w-full flex items-center justify-center md:justify-start md:px-2">
            <SiteNav.User
              user={auth}
              onLogout={() => {
                window.location.href = "/signout";
              }}
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
                          <a href={user.quickLoginHref} className="flex flex-col items-start gap-1 p-2">
                            <span className="font-medium leading-none">{user.name || user.email}</span>
                            <span className="text-xs leading-none text-muted-foreground capitalize">{user.role}</span>
                          </a>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )}
            </SiteNav.User>
          </div>
        </SiteNav.Sidebar>
        <SiteNav.Shell className="pb-8">
          <Header />
          <div className="px-6">{children}</div>
        </SiteNav.Shell>
        <ChatWidget />
      </div>
    </SiteNav.Provider>
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
