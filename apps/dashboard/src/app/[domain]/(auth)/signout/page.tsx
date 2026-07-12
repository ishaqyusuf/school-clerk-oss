"use client";

import { clearAuthCookie } from "@/actions/cookies/auth-cookie";
import { authClient } from "@/auth/client";
import { useLocalTenantHref } from "@school-clerk/tenant-url/react";
import { useEffect } from "react";

export default function SignoutPage() {
  const tenantHref = useLocalTenantHref();

  useEffect(() => {
    void clearAuthCookie().finally(() => {
      void authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.replace(tenantHref("/login"));
          },
        },
      });
    });
  }, [tenantHref]);

  return <></>;
}
