"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { Avatar, AvatarFallback, AvatarImage } from "@school-clerk/ui/avatar";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

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
  const trpc = useTRPC();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { data: unreadCount = 0 } = useQuery(
    trpc.notifications.unreadCount.queryOptions(),
  );
  const displayName = auth.name || auth.email || "User";
  const secondaryText = auth.role || auth.email;
  const tertiaryText = auth.role ? auth.email : undefined;
  const isDark = resolvedTheme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  useEffect(() => setMounted(true), []);

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
        <div className="md:hidden">
          <DropdownMenuItem asChild>
            <Link href="/notifications" className="justify-between">
              <span className="flex items-center">
                <Bell className="mr-2 size-4" />
                Notifications
              </span>
              {unreadCount > 0 ? (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              ) : null}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!mounted}
            onSelect={() => {
              if (!mounted) return;
              setTheme(nextTheme);
            }}
          >
            {isDark ? (
              <Sun className="mr-2 size-4" />
            ) : (
              <Moon className="mr-2 size-4" />
            )}
            Switch to {nextTheme} theme
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </div>
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
