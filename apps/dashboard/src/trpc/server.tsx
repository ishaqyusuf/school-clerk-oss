import "server-only";

import type { AppRouter } from "@school-clerk/api/trpc/routers/_app";
// import { getCountryCode, getLocale, getTimezone } from "@midday/location";
// import { createClient } from "@midday/supabase/server";
import { HydrationBoundary } from "@tanstack/react-query";
import { dehydrate } from "@tanstack/react-query";
import { createTRPCClient, loggerLink } from "@trpc/client";
import { httpBatchLink } from "@trpc/client/links/httpBatchLink";
import {
  createTRPCOptionsProxy,
  type TRPCQueryOptions,
} from "@trpc/tanstack-react-query";
import { cache } from "react";
import superjson from "superjson";
import { makeQueryClient } from "./query-client";
import { getServerRequestContext } from "./request-context";
import { logPerformance } from "@school-clerk/utils/server-performance";

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy<AppRouter>({
  queryClient: getQueryClient,
  client: createTRPCClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson as any,
        async fetch(input, init) {
          const { requestHeaders, requestId } = await getServerRequestContext();
          const host =
            requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
          const protocol =
            requestHeaders.get("x-forwarded-proto") ??
            (host?.includes("localhost") ? "http" : "https");

          const url =
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.toString()
                : input.url;

          const resolvedUrl = url.startsWith("http")
            ? url
            : `${protocol}://${host}${url}`;

          const startedAt = performance.now();
          const timeoutSignal = AbortSignal.timeout(8_000);
          const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
          try {
            return await fetch(resolvedUrl, { ...init, signal });
          } finally {
            logPerformance("ssr.trpc.fetch", startedAt, { requestId });
          }
        },
        async headers() {
          const { profile: cook, requestId } = await getServerRequestContext();
          return {
            "x-request-id": requestId,
            Authorization: `Bearer ${cook?.auth?.bearerToken}`,
            "x-ttss-id": [cook?.termId, cook?.sessionId, cook?.schoolId]?.join(
              "|"
            ),
          };
        },
      }),
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
      }),
    ],
  }),
});

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}

export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(queryOptions: T) {
  const queryClient = getQueryClient();
  const pending = queryOptions.queryKey[1]?.type === "infinite"
    ? queryClient.prefetchInfiniteQuery(queryOptions as any)
    : queryClient.prefetchQuery(queryOptions);
  void pending.catch(() => {
    // Hydrated query error boundaries own the visible failure state.
  });
}

export function batchPrefetch<T extends ReturnType<TRPCQueryOptions<any>>>(queryOptionsArray: T[]) {
  for (const queryOptions of queryOptionsArray) prefetch(queryOptions);
}
