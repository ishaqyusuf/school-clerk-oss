import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getLinkModules, validateLinks } from "./utils";

export const Context =
  createContext<ReturnType<typeof useSidebarContext>>(null);
export const SideBarProvider = Context.Provider;

export interface SidebarProps {
  linkModules;
  pathname;
  auth?: {
    role?: string;
    can?: any;
    userId?: any;
    avatar?;
    name?;
    email?;
  };
  mobile?: boolean;
  Link;
  Logo?: {
    LogoSm?;
    Logo;
  };
  onSelect?;
}
export function useSidebarContext({
  linkModules: _linkModules,
  pathname,
  mobile,
  onSelect,
  auth,
  Logo,
  ...props
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(mobile ? true : false);
  const [dropdownOpened, setDropdownOpened] = useState(false);
  const mainMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mobile) return;
    if (!isExpanded && mainMenuRef.current) {
      (mainMenuRef.current as any).scrollTop = 0;
    }
  }, [isExpanded, mobile]);
  const { activeLink, linkModules, modules, currentModule } = useMemo(() => {
    const linkModules = getLinkModules(
      validateLinks({
        linkModules: _linkModules,
        can: auth?.can || {},
        role: auth?.role,
        userId: auth?.userId,
      })
    );
    const activeLink = Object.entries(linkModules.linksNameMap || {}).find(
      ([href, data]) =>
        (data as any).match == "part"
          ? pathname?.toLocaleLowerCase()?.startsWith(href)
          : href?.toLocaleLowerCase() === pathname?.toLocaleLowerCase()
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
    const currentModule = modules.find(
      (m) => m.name == (activeLink as any)?.module
    );

    return { activeLink, modules, linkModules, currentModule };
  }, [pathname, auth, _linkModules]);
  return {
    // isExpanded: isExpanded || dropdownOpened,
    // for autocollapse on dropdown
    isExpanded: isExpanded && !dropdownOpened,
    isMobile: mobile,
    // setIsExpanded: (a) => {},
    setIsExpanded,
    mainMenuRef,
    linkModules,
    Logo,
    activeLink,
    onSelect,
    modules,
    currentModule,
    Link: props.Link,
    pathname,
    auth,
    dropdownOpened,
    setDropdownOpened,
    // isExpanded,
    // onSelect,
  };
}
export const useSidebar = () => useContext(Context);
