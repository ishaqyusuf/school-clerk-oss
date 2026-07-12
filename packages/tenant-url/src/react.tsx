"use client";

import { Button } from "@school-clerk/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildTenantHref,
  buildTenantUrlVariants,
  type TenantUrlConfig,
  type TenantUrlContext,
} from ".";

export type TenantUrlProviderValue = {
  config: TenantUrlConfig;
  context: TenantUrlContext;
};

const TenantUrlContextValue = createContext<TenantUrlProviderValue | null>(null);

export function TenantUrlProvider({
  children,
  config,
  context,
}: TenantUrlProviderValue & { children: ReactNode }) {
  return (
    <TenantUrlContextValue.Provider value={{ config, context }}>
      {children}
    </TenantUrlContextValue.Provider>
  );
}

export function useTenantUrl() {
  return useContext(TenantUrlContextValue);
}

export function useTenantHref() {
  return useLocalTenantHref();
}

export function useLocalTenantHref() {
  const value = useTenantUrl();

  return useCallback(
    (href: string) => {
      if (!value) return href;
      return buildTenantHref(value.context, href, value.config);
    },
    [value],
  );
}

export function useTenantUrlVariants() {
  const value = useTenantUrl();
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  useEffect(() => {
    const readCurrentUrl = () => setCurrentUrl(window.location.href);
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    type PushStateArgs = Parameters<typeof window.history.pushState>;
    type ReplaceStateArgs = Parameters<typeof window.history.replaceState>;
    const notifyUrlChange = () => {
      window.queueMicrotask(readCurrentUrl);
    };

    readCurrentUrl();
    window.history.pushState = function pushState(...args: PushStateArgs) {
      const result = originalPushState.apply(this, args);
      notifyUrlChange();
      return result;
    };
    window.history.replaceState = function replaceState(
      ...args: ReplaceStateArgs
    ) {
      const result = originalReplaceState.apply(this, args);
      notifyUrlChange();
      return result;
    };
    window.addEventListener("popstate", readCurrentUrl);
    window.addEventListener("hashchange", readCurrentUrl);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", readCurrentUrl);
      window.removeEventListener("hashchange", readCurrentUrl);
    };
  }, []);

  return useMemo(() => {
    if (!value || !currentUrl) return [];

    return buildTenantUrlVariants({
      config: value.config,
      context: value.context,
      currentUrl,
    });
  }, [currentUrl, value]);
}

export function TenantUrlVariantSwitcher({
  enabled = process.env.NODE_ENV !== "production",
}: {
  enabled?: boolean;
}) {
  const variants = useTenantUrlVariants();

  if (!enabled || variants.length === 0) return null;

  const currentVariant = variants.find((variant) => variant.isCurrent);

  return (
    <div className="fixed bottom-4 left-16 z-[90] print:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Open URL variants"
            className="h-10 rounded-full border-border bg-background/95 px-3 text-xs font-semibold shadow-lg backdrop-blur"
            size="sm"
            type="button"
            variant="outline"
          >
            URL
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-[min(420px,calc(100vw-2rem))] p-1"
          side="top"
          sideOffset={8}
        >
          <DropdownMenuLabel className="space-y-0.5">
            <span className="block text-xs font-semibold text-foreground">
              URL variants
            </span>
            <span className="block text-[11px] font-normal text-muted-foreground">
              {currentVariant?.label ?? "Current tenant page"}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {variants.map((variant) => (
            <DropdownMenuItem
              className="cursor-pointer items-start whitespace-normal p-2"
              key={variant.id}
              onSelect={() => {
                window.location.assign(variant.url);
              }}
            >
              <span className="grid min-w-0 flex-1 gap-0.5 text-left">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                  <span className="truncate">{variant.label}</span>
                  {variant.isCurrent ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      Current
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-muted-foreground">
                  {variant.description}
                </span>
                <span className="truncate font-mono text-[11px] text-primary">
                  {variant.url}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
