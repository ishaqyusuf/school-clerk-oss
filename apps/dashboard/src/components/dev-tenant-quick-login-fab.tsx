"use client";

import { usePathname } from "next/navigation";

type QuickLoginUser = {
  email: string;
  name: string | null;
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

  if (
    users.length === 0 ||
    (hideOnLogin && (pathname === "/login" || pathname.endsWith("/login")))
  ) {
    return null;
  }

  return (
    <details className="fixed bottom-4 right-4 z-[90] w-[24rem] [&_summary::-webkit-details-marker]:hidden">
      <summary className="ml-auto flex w-fit cursor-pointer list-none items-center rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-lg transition hover:bg-muted">
        Quick login
      </summary>

      <div className="mt-3 overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            {domain} tenant
          </p>
          <p className="text-xs text-muted-foreground">
            Dev-only sign-in shortcuts using password{" "}
            <span className="font-medium text-foreground">lorem-ipsum</span>.
          </p>
        </div>

        <div className="max-h-[24rem] space-y-3 overflow-y-auto p-3">
          {users.map((user) => (
            <div
              key={user.email}
              className="rounded-2xl border border-border/70 bg-muted/20 p-3"
            >
              <p className="text-sm font-semibold text-foreground">
                {user.name || user.email}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {user.role || "User"}
              </p>

              <div className="mt-3">
                <a
                  href={user.quickLoginHref}
                  className="inline-flex w-full items-center justify-center rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Sign in as this user
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
