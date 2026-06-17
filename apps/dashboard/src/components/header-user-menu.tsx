"use client";

import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@school-clerk/ui/avatar";
import { Button } from "@school-clerk/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { ChevronDown, LogOut } from "lucide-react";

function getInitials(name?: string, email?: string) {
  const value = name || email;
  if (!value) return "";
  if (!name && email) return email.trim()[0]?.toUpperCase() || "";
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function HeaderUserMenu() {
  const auth = useAuth();
  const displayName = auth.name || auth.email || "User";
  const secondaryText = auth.role || auth.email;
  const tertiaryText = auth.role ? auth.email : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 gap-2 rounded-full border-border/80 bg-background px-1.5 pr-2 shadow-none"
          aria-label="Open account menu"
        >
          <Avatar className="size-7">
            <AvatarImage src={auth.avatar} alt={displayName} />
            <AvatarFallback className="text-xs">
              {getInitials(auth.name, auth.email)}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-lg">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-9">
              <AvatarImage src={auth.avatar} alt={displayName} />
              <AvatarFallback className="text-xs">
                {getInitials(auth.name, auth.email)}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate font-semibold">{displayName}</span>
              {secondaryText ? (
                <span className="truncate text-xs text-muted-foreground">
                  {secondaryText}
                </span>
              ) : null}
              {tertiaryText ? (
                <span className="truncate text-xs text-muted-foreground">
                  {tertiaryText}
                </span>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            window.location.href = "/signout";
          }}
        >
          <LogOut className="mr-2 size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
