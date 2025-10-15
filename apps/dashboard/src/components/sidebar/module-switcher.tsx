import { Fragment, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@school-clerk/ui/sidebar";

import { Icon, Icons } from "../icons";
import { useSidebar } from "./context";
import { useSidebarStore } from "./store";
import { useAsyncMemo } from "use-async-memo";
import { timeout } from "@/utils/timeout";
import { randomInt } from "@/utils/utils";
import { getTermListAction } from "@/actions/get-term-list";
import { useTRPC } from "@/trpc/client";
import { switchSessionTerm } from "@/actions/cookies/auth-cookie";
import { Button } from "@school-clerk/ui/button";
import { useAcademicParams } from "@/hooks/use-academic-params";

export function ModuleSwitcher() {
  const sb = useSidebar();
  const store = useSidebarStore();
  const { isMobile } = sb;
  const route = useRouter();
  function switchModule(moduleName) {
    const links = Object.values(store.links);
    const link = links
      .sort((a, b) => a.globalIndex - b.globalIndex)
      // .filter((a) => a.visible)
      .find((a) => a.moduleName == moduleName);
    route?.push(link?.url);
  }
  const { modules, currentModule } = useMemo(() => {
    const modules = Object.values(store?.siteModules ?? {}).filter(Boolean);
    const currentModule = modules.find(
      (module) => module?.name == store.activeModule
    );
    return {
      modules,
      currentModule,
    };
  }, [store]);
  const termProfiles = useAsyncMemo(async () => {
    await timeout(randomInt(200));
    return await getTermListAction();
  }, []);
  const trpc = useTRPC();
  async function switchSession(termId) {
    await switchSessionTerm(termId);
  }
  const asp = useAcademicParams();
  if (!modules?.length || !termProfiles) return null;
  return (
    <SidebarMenu>
      <SidebarMenuItem className="flex flex-col gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Icon name={currentModule?.icon as any} className="size-6" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {termProfiles?.current?.sessionTitle}
                </span>
                <span className="text-xs uppercase  font-medium text-muted-foreground">
                  {termProfiles?.current?.term?.title}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs flex justify-between text-muted-foreground">
              <span>Session Profiles</span>
            </DropdownMenuLabel>
            {termProfiles?.sessions.map((session, index) => (
              <Fragment key={index}>
                {index == 0 || <DropdownMenuSeparator />}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex justify-between">
                    <span>{session?.title}</span>
                    <div>
                      <Button
                        onClick={(e) => {
                          asp.setParams({
                            academicSessionFormType: "term",
                            sessionId: session?.id,
                          });
                        }}
                        className="p-1 size-5"
                        variant="secondary"
                      >
                        <Icons.add className="size-4" />
                      </Button>
                    </div>
                  </DropdownMenuLabel>
                  {session?.terms?.map((term, index) => (
                    <DropdownMenuItem
                      onClick={(e) => {
                        switchSession(term.id);
                      }}
                      key={index}
                      // onClick={() => setActiveTeam(team)}
                      className="gap-2 p-2"
                    >
                      <div className="flex size-6 items-center justify-center rounded-sm border">
                        {/* <Icon
                        name={team?.icon as any}
                        className="size-4 shrink-0"
                      /> */}
                      </div>
                      <div className="">
                        <p> {term.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {" "}
                          {session.title}
                        </p>
                      </div>
                      <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </Fragment>
            ))}
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground border"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Icon name={currentModule?.icon as any} className="size-6" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {currentModule?.title}
                </span>
                <span className="truncate text-xs">
                  {currentModule?.subtitle}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Modules
            </DropdownMenuLabel>
            {modules.map((team, index) => (
              <DropdownMenuItem
                onClick={(e) => {
                  switchModule(team.name);
                }}
                key={team.name}
                // onClick={() => setActiveTeam(team)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Icon name={team?.icon as any} className="size-4 shrink-0" />
                </div>
                <div className="">
                  <p> {team.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {" "}
                    {team.subtitle}
                  </p>
                </div>
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
