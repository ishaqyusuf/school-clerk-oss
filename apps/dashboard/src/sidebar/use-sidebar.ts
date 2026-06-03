import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getLinkModules, validateLinks } from "@school-clerk/ui/nav/utils";
import { linkModules as dashboardLinkModules } from "@/features/navigation/sidebar-modules";
type SidebarContext = ReturnType<typeof createSidebarContext>;
export const SidebarContext = createContext<SidebarContext>(undefined);
export const SidebarProvider = SidebarContext.Provider;
export const createSidebarContext = ({ onSelect, mobile = false }) => {
  const [isExpanded, setIsExpanded] = useState(mobile ? true : false);
  const mainMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mobile) return;
    if (!isExpanded && mainMenuRef.current) {
      (mainMenuRef.current as any).scrollTop = 0;
    }
  }, [isExpanded, mobile]);
  const linkModules = useLinks();
  // linkModules.moduleLinksCount

  const pathName = usePathname();
  const { activeLink, modules, currentModule } = useMemo(() => {
    const activeLink = Object.entries(linkModules.linksNameMap || {}).find(
      ([href, data]) =>
        (data as any).match == "part"
          ? pathName?.toLocaleLowerCase()?.startsWith(href)
          : href?.toLocaleLowerCase() === pathName?.toLocaleLowerCase()
    )?.["1"];
    const modules = linkModules?.modules
      ?.filter((a) => a.activeLinkCount && a?.name)
      .map((module) => {
        const prim = module?.sections
          ?.map((a) => a.links?.filter((l) => l.show))
          ?.flat()
          ?.sort((a, b) => a.globalIndex - b.globalIndex)?.[0];
        const href =
          module.defaultLink ||
          prim?.href ||
          prim?.subLinks?.filter((a) => a.show)?.[0]?.href;
        return {
          ...module,
          href,
        };
      });
    const currentModule = modules.find((m) => m.name == (activeLink as any)?.module);

    return { activeLink, modules, currentModule };
  }, [pathName, linkModules]);

  return {
    activeLink,
    currentModule,
    isExpanded,
    linkModules,
    mainMenuRef,
    modules,
    onSelect,
    pathName,
    setIsExpanded,
  };
};
export const useSidebarContext = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebarContext must be used within a SidebarProvider");
  }
  return context;
};
export function useLinks() {
  const user = useAuth();
  const linkModules = getLinkModules(
    validateLinks({
      linkModules: dashboardLinkModules,
      role: user.role?.name,
      can: (user as any).can ?? {},
      userId: user?.id,
    })
  );
  return linkModules;
}
