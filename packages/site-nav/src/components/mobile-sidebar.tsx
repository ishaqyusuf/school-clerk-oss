import { Button } from "@school-clerk/ui/button";
import { Sheet } from "@school-clerk/ui/composite";
import { Icons } from "@school-clerk/ui/icons";
import { Icons as CustomIcons } from "@school-clerk/ui/custom/icons";
import { useState } from "react";
import { NavsList } from "./navs-list";
import { useSiteNav } from "./use-site-nav";

export function MobileSidebar() {
  const [isOpen, setOpen] = useState(false);
  const {
    linkModules,
    props: { mobileSidebarLogo, mobileSidebarFooter },
  } = useSiteNav();
  if (linkModules?.noSidebar) return null;
  return (
    <div className="md:hidden">
      <Sheet.Root open={isOpen} onOpenChange={setOpen}>
        <div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOpen(true)}
            className="rounded-full w-8 h-8 items-center relative flex md:hidden"
          >
            <Icons.Menu size={16} />
          </Button>
        </div>
        <Sheet.Content
          side="left"
          className="flex h-dvh w-[min(88vw,340px)] flex-col gap-0 border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <Sheet.Header>
            <Sheet.Title></Sheet.Title>
            <Sheet.Description></Sheet.Description>
          </Sheet.Header>
          <div className="flex h-[70px] shrink-0 items-center border-b border-sidebar-border px-4">
            {mobileSidebarLogo ?? <CustomIcons.LogoLg />}
          </div>

          <div className="scrollbar-hide min-h-0 flex-1 overflow-auto pb-4">
            <NavsList mobile onSelect={() => setOpen(false)} />
          </div>
          {mobileSidebarFooter ? (
            <div className="shrink-0 border-t border-sidebar-border bg-sidebar p-3">
              {mobileSidebarFooter}
            </div>
          ) : null}
        </Sheet.Content>
      </Sheet.Root>
    </div>
  );
}
