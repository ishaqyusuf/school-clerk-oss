import { cn } from "@school-clerk/ui/cn";
import { useSiteNav } from "./use-site-nav";
import { NavsList } from "./navs-list";

interface Props {}

export function Sidebar({ children }) {
  const ctx = useSiteNav();
  const { isExpanded, mainMenuRef, setIsExpanded } = ctx;
  console.log(ctx);
  return (
    <aside
      className={cn(
        "h-screen flex-shrink-0 flex-col desktop:overflow-hidden desktop:rounded-tl-[10px] desktop:rounded-bl-[10px] justify-between fixed top-0 pb-4 items-center hiddens md:flex z-50 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "bg-background border-r border-border",
        isExpanded ? "w-[240px]" : "w-[70px]"
      )}
    >
      {/* {children} */}
      <div
        ref={mainMenuRef}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className="flex flex-col overflow-y-auto scrollbar-hide w-full pb-[100px] flex-1"
      >
        <NavsList />
      </div>
    </aside>
  );
}
