"use client";

import { authClient } from "@/auth/client";
import { useEffect } from "react";

export default function SignoutPage() {
  useEffect(() => {
    void authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.replace("/");
        },
      },
    });
  }, []);

  return <></>;
}
