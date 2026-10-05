"use client";
import type { AppRouter } from "@school-clerk/api/trpc/routers/_app";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { QueryClientProvider, isServer } from "@tanstack/react-query";
import { makeQueryClient } from "./query-client";
import { useState } from "react";
import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import superjson from "superjson";
import type { AuthCookie } from "@/utils/workspace-cookie";
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

let browserQueryClient: QueryClient;
function getQueryClient() {
  if (isServer) {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one
  // This is very important, so we don't re-make a new client if React
  // suspends during the initial render. This may not be needed if we
  // have a suspense boundary BELOW the creation of the query client
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function TRPCReactProvider(
  props: Readonly<{
    children: React.ReactNode;
  }>
) {
  const queryClient = getQueryClient();
  const isProd = process.env.NODE_ENV === "production";
  // const url = window.location.origin;
  // console.log({ domain });
  // "http://daarulhadith.localhost:2200/academic/classes?openSubjectSecondaryId=eed879bb-20db-457b-bd06-ae09643b959b&subjectTab=recordings"
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          // url: `${process.env.NEXT_PUBLIC_URL}/api/trpc`,
          url: `/api/trpc`,
          // url: `${url}/api/trpc`,
          // url:
          //   process.env.NODE_ENV === "production"
          //     ? `https://daarulhadith.vercel.app/api/trpc`
          //     : `${process.env.NEXT_PUBLIC_API_URL}/api/trpc`,
          // url: `${process.env.NEXT_PUBLIC_URL}/api/trpc`,
          transformer: superjson as any,
          //   fetch(input,iniit) {
          //   },
          async headers() {
            // Server prefetch owns SSR reads; this link only loads browser context.
            if (isServer) return {};
            const response = await fetch("/api/profile", { cache: "no-store" });
            if (response.status === 401) {
              const login = new URL("/login", window.location.origin);
              login.searchParams.set("return_to", window.location.pathname + window.location.search);
              window.location.replace(login);
              throw new Error("Your session has ended. Please sign in again.");
            }
            if (!response.ok) throw new Error("Unable to load your school workspace.");
            const cook: AuthCookie = await response.json();
            return {
              Authorization: `Bearer ${cook?.auth?.bearerToken}`,
              "x-ttss-id": [
                cook?.termId,
                cook?.sessionId,
                cook?.schoolId,
              ]?.join("|"),
            };
          },
        }),

        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
      ],
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
      {/* <ReactQueryDevtools initialIsOpen={false} /> */}
    </QueryClientProvider>
  );
}
