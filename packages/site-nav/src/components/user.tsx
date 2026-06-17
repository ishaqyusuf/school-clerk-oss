import { Avatar, AvatarFallback, AvatarImage } from "@school-clerk/ui/avatar";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { Icons } from "@school-clerk/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { useSiteNav } from "./use-site-nav";
import type { ReactNode } from "react";

type SiteNavUserData = {
  name?: string;
  email?: string;
  avatar?: string;
  role?: string;
};

interface SiteNavUserProps {
  user: SiteNavUserData;
  onLogout?: () => void;
  children?: ReactNode;
  expanded?: boolean;
  dropdownSide?: "top" | "right" | "bottom" | "left";
  className?: string;
}

function getInitials(name?: string, email?: string) {
  const value = name || email;
  if (!value) return "";
  if (!name && email) return email.trim()[0]?.toUpperCase() || "";
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

export function User({
  user,
  onLogout,
  children,
  expanded,
  dropdownSide = "right",
  className,
}: SiteNavUserProps) {
  const { isExpanded } = useSiteNav();
  const showDetails = expanded ?? isExpanded;
  const secondaryText = user?.role || user?.email;
  const tertiaryText = user?.role ? user?.email : undefined;
  const displayName = user?.name || user?.email || "User";

  return (
    <div
      className={cn(
        "relative h-[40px] w-full overflow-hidden rounded-md border border-border bg-background",
        className,
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="lg"
            variant="link"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex h-full w-full gap-2 px-2"
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user?.avatar} alt={displayName} />
              <AvatarFallback className="rounded-lg">
                {getInitials(user?.name, user?.email)}
              </AvatarFallback>
            </Avatar>
            {!showDetails || (
              <>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs">{secondaryText}</span>
                </div>
                <Icons.ChevronDown className="ml-auto size-4" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          side={dropdownSide}
          align="end"
          sideOffset={4}
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.avatar} alt={displayName} />
                <AvatarFallback className="rounded-lg">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs">{secondaryText}</span>
                {tertiaryText ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {tertiaryText}
                  </span>
                ) : null}
              </div>
            </div>
          </DropdownMenuLabel>
          {children ? <DropdownMenuSeparator /> : null}
          {children}
          {onLogout ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <Icons.ExitToApp className="size-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
