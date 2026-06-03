import { GlobalSheets } from "@/components/sheets/global-sheets";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";

export default async function Layout({ children }) {
  return (
    <HydrateClient>
      {children}
      <Suspense>
        <GlobalSheets />
      </Suspense>
    </HydrateClient>
  );
}
