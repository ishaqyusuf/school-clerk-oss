import { Suspense } from "react";
import { GlobalSheets } from "@/components/sheets/global-sheets";

import { HydrateClient } from "@/trpc/server";
import { SidebarClient } from "./layout.client";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { cn } from "@school-clerk/ui/cn";
import { Header } from "@/components/header";

export default async function LayoutNew({ children }) {
  const cookie = await getAuthCookie();
  if (!cookie?.schoolId) {
    return null;
  }
  return (
    <HydrateClient>
      <div className="relative">
        <SidebarClient />
        <div
          className={cn(
            "pb-8",
            // ctx?.linkModules?.noSidebar ||
            "md:ml-[70px]"
          )}
        >
          <Header />
          <div className="px-6">{children}</div>
        </div>
      </div>
      <Suspense>
        <GlobalSheets />
      </Suspense>
    </HydrateClient>
  );
}
