type TenantLink = {
  dashboardHref: string;
  mainHref: string;
  name: string;
  subdomain: string;
};

export function DevTenantsFab({ tenants }: { tenants: TenantLink[] }) {
  if (tenants.length === 0) return null;

  return (
    <details className="fixed bottom-4 right-4 z-[90] w-[22rem] [&_summary::-webkit-details-marker]:hidden">
      <summary className="ml-auto flex w-fit cursor-pointer list-none items-center rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-lg transition hover:bg-muted">
        Dev tenants
      </summary>

      <div className="mt-3 overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            Tenant shortcuts
          </p>
          <p className="text-xs text-muted-foreground">
            Jump into dashboard or public-site views quickly.
          </p>
        </div>

        <div className="max-h-[24rem] space-y-3 overflow-y-auto p-3">
          {tenants.map((tenant) => (
            <div
              key={tenant.subdomain}
              className="rounded-2xl border border-border/70 bg-muted/20 p-3"
            >
              <p className="text-sm font-semibold text-foreground">
                {tenant.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tenant.subdomain}
              </p>

              <div className="mt-3 flex gap-2">
                <a
                  href={tenant.dashboardHref}
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  Dashboard
                </a>
                <a
                  href={tenant.mainHref}
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-border px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted"
                >
                  Main
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
