"use client";
import { useAuth } from "@/hooks/use-auth";
import { createSiteNavContext, SiteNav } from "@school-clerk/site-nav";
import { Icons } from "@school-clerk/ui/custom/icons";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { linkModules } from "./sidebar/links";
import Link from "next/link";
import { ChatWidget } from "./chat/chat-widget";

export function NavLayoutClient({ children }) {
  const auth = useAuth();
  const pathName = usePathname();
  return (
    <SiteNav.Provider
      value={createSiteNavContext({
        pathName,
        linkModules,
        Link,
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
            />
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
