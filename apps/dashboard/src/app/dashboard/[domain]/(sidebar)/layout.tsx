import { Suspense } from "react";
import { GlobalSheets } from "@/components/sheets/global-sheets";
import { HydrateClient } from "@/trpc/server";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { NavLayoutClient } from "@/components/nav-layout-client";
import { GlobalModals } from "@/components/modals/global-modals";

export default async function LayoutNew({ children }) {
  const cookie = await getAuthCookie();
  if (!cookie?.schoolId) {
    return null;
  }
  return (
    <HydrateClient>
      <NavLayoutClient>{children}</NavLayoutClient>

      <Suspense>
        <GlobalSheets />
        <GlobalModals />
      </Suspense>
    </HydrateClient>
  );
}
