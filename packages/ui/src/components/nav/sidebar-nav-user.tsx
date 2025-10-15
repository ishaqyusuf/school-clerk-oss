import { useRef, useState } from "react";
import { Button } from "../button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdown-menu";
import { useSidebar } from "./use-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { getInitials } from "@school-clerk/utils";
import { ChevronsUpDown, LogOut } from "lucide-react";

export function SidebarNavUser({}) {
  const { isExpanded, auth, setDropdownOpened, isMobile, Link } = useSidebar();
  const [opened, setOpened] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="relative h-[40px] " ref={ref}>
      <div className="fixed left-[19px] bottom-4 w-[32px] h-[32px]">
        <div className="relative w-[32px] h-[32px]"></div>
      </div>
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
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex gap-2 px-2 w-full"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={auth.avatar} alt={auth.name} />
              <AvatarFallback className="rounded-lg">
                {getInitials(auth.name)}
              </AvatarFallback>
            </Avatar>
            {!isExpanded || (
              <>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{auth.name}</span>
                  <span className="truncate text-xs">{auth.email}</span>
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
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={auth.avatar} alt={auth.name} />
                <AvatarFallback className="rounded-lg">
                  {getInitials(auth.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{auth.name}</span>
                <span className="truncate text-xs">{auth.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <Sparkles />
                                Upgrade to Pro
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <BadgeCheck />
                                Account
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <CreditCard />
                                Billing
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Bell />
                                Notifications
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator /> */}
          <Link href={`/signout`}>
            <DropdownMenuItem>
              <LogOut className="size-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
