import { Button } from "@school-clerk/ui/button";
import { Sheet, SheetContent } from "@school-clerk/ui/sheet";
import { useState } from "react";
import { Icons } from "../../../../../apps/dashboard/src.example/components/icons";
import { MainMenu } from "@school-clerk/ui/nav/sidebar";
import { SideBarProvider } from "./use-sidebar";

export function MobileMenu({ value }) {
  const [isOpen, setOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
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
      <SheetContent side="left" className="border-none rounded-none -ml-4">
        <div className="ml-2 mb-8">{/* <Icons.Logo /> */}</div>

        <div className="-ml-2">
          <SideBarProvider
            value={{
              ...value,
              onSelect: () => setOpen(false),
              mobile: true,
            }}
          >
            <MainMenu />
          </SideBarProvider>
        </div>
      </SheetContent>
    </Sheet>
  );
}
