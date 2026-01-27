"use client";
import { useAuth } from "@/hooks/use-auth";
import { createSiteNavContext, SiteNav } from "@school-clerk/site-nav";
import { usePathname } from "next/navigation";
import { Header } from "./header";
import { linkModules } from "./sidebar/links";
import Link from "next/link";
import { NavsList } from "node_modules/@school-clerk/site-nav/src/components/navs-list";
import { ModuleSwitcher } from "./sidebar/module-switcher";
import { TermSwitcher } from "./sidebar/term-switcher";

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
      <div className="relative">
        <SiteNav.Sidebar>
          <TermSwitcher />
          {/* <ModuleSwitcher /> */}
        </SiteNav.Sidebar>
        <SiteNav.Shell className="pb-8">
          <Header />
          <div className="px-6">{children}</div>
        </SiteNav.Shell>
      </div>
    </SiteNav.Provider>
  );
}
