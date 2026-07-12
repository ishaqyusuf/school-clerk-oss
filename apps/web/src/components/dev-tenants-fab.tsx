"use client";

import { useMemo } from "react";
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
import {
  buildDevTenantDashboardUrl,
  buildDevTenantSiteUrl,
  getPortlessCurrentOrigin,
} from "@/lib/dev-tenant-site-url";

type TenantLink = {
  id: string;
  name: string;
  slug: string;
  studentCount: number;
};

export function DevTenantsFab({
  dashboardPort,
  dashboardRootDomain,
  sitePort,
  siteRootDomain,
  tenants,
}: {
  dashboardPort?: number | string | null;
  dashboardRootDomain: string;
  sitePort?: number | string | null;
  siteRootDomain: string;
  tenants: TenantLink[];
}) {
  const currentOrigin = useMemo(
    () =>
      getPortlessCurrentOrigin(
        typeof window === "undefined" ? undefined : window.location.origin,
      ),
    [],
  );

  if (tenants.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[90] sm:bottom-6 sm:right-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Open dev school picker"
            className="size-14 rounded-full shadow-[0_18px_48px_rgba(15,23,42,0.22)]"
            type="button"
          >
            Dev
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="max-h-[min(30rem,calc(100vh-2rem))] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-1"
          side="top"
          sideOffset={10}
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-3 py-2">
              Dev School Picker
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {tenants.map((tenant) => (
              <div className="px-2 py-2" key={tenant.id}>
                <div className="flex items-start justify-between gap-3 px-1">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {tenant.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {tenant.slug}
                    </span>
                  </span>
                  <Badge className="shrink-0" variant="outline">
                    {formatStudentCount(tenant.studentCount)}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer justify-center rounded-md border border-border px-2 py-1.5 text-xs font-semibold"
                  >
                    <a
                      href={buildDevTenantSiteUrl({
                        currentOrigin,
                        sitePort,
                        siteRootDomain,
                        tenantSlug: tenant.slug,
                      })}
                    >
                      Site
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer justify-center rounded-md border border-border px-2 py-1.5 text-xs font-semibold"
                  >
                    <a
                      href={buildDevTenantDashboardUrl({
                        currentOrigin,
                        dashboardPort,
                        dashboardRootDomain,
                        tenantSlug: tenant.slug,
                      })}
                    >
                      Dash
                    </a>
                  </DropdownMenuItem>
                </div>
              </div>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function formatStudentCount(count: number) {
  return `${count.toLocaleString()} ${count === 1 ? "student" : "students"}`;
}
