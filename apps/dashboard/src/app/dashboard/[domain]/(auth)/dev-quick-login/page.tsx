"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function DevQuickLoginPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      window.location.replace("/login");
      return;
    }

    const email = searchParams.get("email") ?? "";
    const password = searchParams.get("password") ?? "lorem-ipsum";
    const returnTo = searchParams.get("return_to") ?? "";
    const nextUrl = new URL("/login", window.location.origin);

    if (email) {
      nextUrl.searchParams.set("email", email);
    }
    if (password) {
      nextUrl.searchParams.set("password", password);
    }
    if (returnTo) {
      nextUrl.searchParams.set("return_to", returnTo);
    }

    window.location.replace(nextUrl.toString());
  }, [searchParams]);

  return null;
}
