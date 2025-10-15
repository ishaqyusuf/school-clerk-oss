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
import { getSession } from "@/auth/server";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";

// IMPORTANT: Create a stable getter for the query client that
//            will return the same client during the same request.
export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy<AppRouter>({
  queryClient: getQueryClient,
  client: createTRPCClient({
    links: [
      httpBatchLink({
        // url: `${process.env.NEXT_PUBLIC_API_URL}/api/trpc`,
        // url: `${process.env.NEXT_PUBLIC_URL}/api/trpc`,
        // url: `http://localhost:2200/api/trpc`,
        url: `${process.env.NEXT_PUBLIC_URL}/api/trpc`,
        // url:
        //   process.env.NODE_ENV === "production"
        //     ? `https://daarulhadith.vercel.app/api/trpc`
        //     : `${process.env.NEXT_PUBLIC_API_URL}/api/trpc`,
        transformer: superjson as any,
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
    void queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    void queryClient.prefetchQuery(queryOptions);
  }
}

export function batchPrefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptionsArray: T[]
) {
  const queryClient = getQueryClient();

  for (const queryOptions of queryOptionsArray) {
    if (queryOptions.queryKey[1]?.type === "infinite") {
      void queryClient.prefetchInfiniteQuery(queryOptions as any);
    } else {
      void queryClient.prefetchQuery(queryOptions);
    }
  }
}
