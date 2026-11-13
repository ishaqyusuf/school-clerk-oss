"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTenantRouter as useRouter } from "@school-clerk/tenant-url/next";
import { ApiErrorState } from "./api-error-state";
import { getFirstPermittedHref } from "./sidebar/links";

export function ErrorFallback({
	error,
	reset,
}: {
	error?: unknown;
	reset?: () => void;
}) {
	const router = useRouter();
	const { role } = useAuth();

	return (
		<ApiErrorState
			error={error}
			homeHref={role ? getFirstPermittedHref({ role }) : "/"}
			onRetry={() => {
				reset?.();
				router.refresh();
			}}
		/>
	);
}
