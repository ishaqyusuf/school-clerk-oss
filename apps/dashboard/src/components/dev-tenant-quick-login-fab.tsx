"use client";

import { Avatar, AvatarFallback } from "@school-clerk/ui/avatar";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { KeyRound, LogIn } from "lucide-react";
import { usePathname } from "next/navigation";

type QuickLoginUser = {
  email: string;
  name: string | null;
  onQuickLogin?: () => void | Promise<void>;
  quickLoginHref: string;
  role: string | null;
};

export function DevTenantQuickLoginFab({
  domain,
  hideOnLogin = true,
  users,
}: {
  domain: string;
  hideOnLogin?: boolean;
  users: QuickLoginUser[];
}) {
  const pathname = usePathname();

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (hideOnLogin && (pathname === "/login" || pathname?.endsWith("/login"))) {
    return null;
  }

  if (users.length === 0) {
    console.warn(
      "DevTenantQuickLoginFab: users array is empty, but rendering anyway for debugging",
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-50 h-10 gap-2 rounded-full bg-background px-4 shadow-lg"
        >
          <KeyRound data-icon="inline-start" />
          Quick login
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[calc(100vw-2rem)] p-2 sm:w-80"
      >
        <DropdownMenuLabel className="flex flex-col gap-1 px-2 py-2">
          <span>{domain} tenant</span>
          <span className="text-xs font-normal leading-5 text-muted-foreground">
            Dev-only sign-in shortcuts using password{" "}
            <span className="font-medium text-foreground">lorem-ipsum</span>.
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="flex flex-col gap-1">
          {users.map((user) => (
            <QuickLoginUserLabel key={user.email} user={user} />
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function QuickLoginUserLabel({ user }: { user: QuickLoginUser }) {
  const content = (
    <>
      <Avatar className="size-9 border">
        <AvatarFallback className="text-xs font-medium">
          {getInitials(user.name || user.email)}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {user.name || user.email}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {user.email}
        </span>
      </span>
      <Badge variant="secondary" className="shrink-0 capitalize">
        {user.role || "User"}
      </Badge>
      <LogIn className="shrink-0 text-muted-foreground" />
    </>
  );

  if (user.onQuickLogin) {
    return (
      <DropdownMenuItem
        className="gap-3 p-2"
        onSelect={() => {
          user.onQuickLogin?.();
        }}
      >
        {content}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem asChild className="gap-3 p-2">
      <a href={user.quickLoginHref}>{content}</a>
    </DropdownMenuItem>
  );
}

function getInitials(value: string) {
  const parts = value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2);

  return (parts.map((part) => part[0]).join("") || "SC").toUpperCase();
}
