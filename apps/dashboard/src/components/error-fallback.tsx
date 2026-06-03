"use client";

import { useTenantRouter as useRouter } from "@school-clerk/tenant-url/next";
import { ApiErrorState } from "./api-error-state";

export function ErrorFallback({
  error,
  reset,
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
}) {
  const router = useRouter();

  return (
    <ApiErrorState
      error={error}
      onRetry={() => {
        reset?.();
        router.refresh();
      }}
    />
  );
}
