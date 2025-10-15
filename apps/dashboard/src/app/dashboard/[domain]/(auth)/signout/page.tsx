"use client";

import { authClient } from "@/auth/client";
import { useEffect } from "react";

export default function SignoutPage() {
  useEffect(() => {
    authClient.signOut({
      callbackUrl: "",
    });
  }, []);

  return <></>;
}
