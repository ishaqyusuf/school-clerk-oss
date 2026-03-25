"use client";

import { useEffect } from "react";
import { ApiErrorState } from "@/components/api-error-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only capture exceptions in production
    if (process.env.NODE_ENV === "production") {
      // Dynamically import Sentry only in production
      // import("@sentry/nextjs").then((Sentry) => {
      //   Sentry.captureException(error);
      // });
    }
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ApiErrorState
          title="The dashboard hit an unexpected error"
          description="Something broke before the page could finish loading. You can retry now, or sign out and in again if your session is out of sync."
          error={error}
          onRetry={reset}
        />
      </body>
    </html>
  );
}
