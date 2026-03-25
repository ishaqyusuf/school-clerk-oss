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
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { headers } from "next/headers";

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
          const requestHeaders = await headers();
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

          return fetch(resolvedUrl, init);
        },
        async headers() {
          const cook = await getAuthCookie();
          return {
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

export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptions: T
) {
  const queryClient = getQueryClient();

  if (queryOptions.queryKey[1]?.type === "infinite") {
    return queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    return queryClient.prefetchQuery(queryOptions);
  }
}

export async function batchPrefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptionsArray: T[]
) {
  const queryClient = getQueryClient();

  await Promise.allSettled(
    queryOptionsArray.map((queryOptions) => {
      if (queryOptions.queryKey[1]?.type === "infinite") {
        return queryClient.prefetchInfiniteQuery(queryOptions as any);
      }

      return queryClient.prefetchQuery(queryOptions);
    })
  );
}
