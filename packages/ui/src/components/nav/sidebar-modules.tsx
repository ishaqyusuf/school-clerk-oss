import { useRef, useState } from "react";
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { useSidebar } from "./use-sidebar";
import { ChevronsUpDown } from "lucide-react";
import { Icon } from "../custom/icons";

export function SidebarModules() {
  const {
    isExpanded,
    isMobile,
    auth,
    setDropdownOpened,
    Link,
    modules,
    currentModule,
  } = useSidebar();
  // const user = useAuth();
  const ref = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);

  if (modules.length < 2) return null;

  return (
    <div className="relative flex-1 h-10" ref={ref}>
      {/* <div className="fixed left-[19px] top-4 w-[32px] h-[32px]">
                <div className="relative w-[32px] h-[32px] bg-red-500"></div>
            </div> */}
      <DropdownMenu
        open={opened}
        onOpenChange={(e) => {
          setOpened(e);
          setDropdownOpened(e);
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            variant="link"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex gap-2 px-5 w-full"
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary ">
              <Icon
                name={currentModule?.icon as any}
                className="size-4 text-primary-foreground"
              />
            </div>
            {!isExpanded || (
              <>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {currentModule?.title}
                  </span>
                  <span className="truncate text-xs">
                    {currentModule?.subtitle}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          side={isMobile ? "bottom" : "right"}
          align="end"
          sideOffset={4}
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Modules
          </DropdownMenuLabel>
          {modules.map((team, index) => (
            <DropdownMenuItem asChild key={team.name} className="gap-2 p-2">
              <Link href={team?.href}>
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Icon name={team?.icon as any} className="size-4 shrink-0" />
                </div>
                {team.title}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </Link>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
