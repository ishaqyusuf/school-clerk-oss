import { Suspense } from "react";
import { GlobalSheets } from "@/components/sheets/global-sheets";
import { HydrateClient } from "@/trpc/server";
import { getAuthCookie } from "@/actions/cookies/auth-cookie";
import { NavLayout } from "@/components/nav-layout";
import { GlobalModals } from "@/components/modals/global-modals";

export default async function LayoutNew({ children }) {
  const cookie = await getAuthCookie();
  if (!cookie?.schoolId) {
    return null;
  }
  return (
    <HydrateClient>
      {/* <div className="relative"> */}
      {/* <SidebarClient /> */}
      <NavLayout>{children}</NavLayout>
      {/* <div
          className={cn(
            "pb-8", 
            "md:ml-[70px]"
          )}
        >
          <Header />
          <div className="px-6">{children}</div>
        </div> */}
      {/* </div> */}
      <Suspense>
        <GlobalSheets />
        <GlobalModals />
      </Suspense>
    </HydrateClient>
  );
}
