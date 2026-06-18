"use client";

import { Avatar, AvatarFallback } from "@school-clerk/ui/avatar";
import { Badge } from "@school-clerk/ui/badge";
import { KeyRound, LogIn } from "lucide-react";
import { usePathname } from "next/navigation";

type QuickLoginUser = {
  email: string;
  name: string | null;
  onQuickLogin?: () => void | Promise<void>;
  quickLoginHref?: string;
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
    <details className="group fixed bottom-4 right-4 z-[80] flex flex-col-reverse items-end">
      <summary className="ml-auto flex h-10 w-fit touch-manipulation list-none cursor-pointer select-none items-center justify-center gap-2 rounded-full border bg-background px-4 text-sm font-medium shadow-lg transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <KeyRound data-icon="inline-start" />
          Quick login
        </span>
      </summary>
      <div className="mb-3 w-[calc(100vw-2rem)] overflow-hidden border bg-background p-2 text-popover-foreground shadow-lg sm:w-80">
        <div className="flex flex-col gap-1 px-2 py-2">
          <span className="text-sm font-semibold">{domain} tenant</span>
          <span className="text-xs font-normal leading-5 text-muted-foreground">
            Dev-only sign-in shortcuts for local tenant testing.
          </span>
        </div>
        <div className="-mx-2 my-1 h-px bg-border" />
        <div className="flex flex-col gap-1">
          {users.map((user) => (
            <QuickLoginUserLabel key={user.email} user={user} />
          ))}
        </div>
      </div>
    </details>
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
      <button
        type="button"
        className="relative flex w-full select-none items-center gap-3 px-2 py-2 text-left text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground"
        onClick={() => {
          void user.onQuickLogin?.();
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <a
      className="relative flex w-full select-none items-center gap-3 px-2 py-2 text-left text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground"
      href={user.quickLoginHref ?? "#"}
    >
      {content}
    </a>
  );
}

function getInitials(value: string) {
  const parts = value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2);

  return (parts.map((part) => part[0]).join("") || "SC").toUpperCase();
}
