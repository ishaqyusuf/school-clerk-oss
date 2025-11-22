"use client";
import { useAuth } from "@/hooks/use-auth";
import { createSiteNavContext, SiteNav } from "@school-clerk/site-nav";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { linkModules } from "./sidebar/links";
import Link from "next/link";

export function NavLayoutClient({ children }) {
  const auth = useAuth({
    required: true,
  });
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
      <SiteNav.Sidebar>
        {/* Logo area */}
        {/* <div className="pt-[75px] flex w-full"><SidebarModules /></div> */}
        {/* <SiteNav.NavsList /> */}
        <div className="flex flex-col overflow-y-auto scrollbar-hide w-full pb-[100px] flex-1">
          {/* <MainMenu/> */}
        </div>
      </SiteNav.Sidebar>
      <SiteNav.Shell className="pb-8">
        <Header />
        <div className="px-6">{children}</div>
      </SiteNav.Shell>
      {/* <div className={cn("p-8", "md:ml-[70px]")}></div> */}
    </SiteNav.Provider>
  );
}
