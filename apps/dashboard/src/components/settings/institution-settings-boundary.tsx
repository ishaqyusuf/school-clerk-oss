"use client";

import { ErrorFallback } from "@/components/error-fallback";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense, type ReactNode } from "react";

export function InstitutionSettingsBoundary({
	children,
	loadingLabel = "Loading institution settings",
}: {
	children: ReactNode;
	loadingLabel?: string;
}) {
	return (
		<QueryErrorResetBoundary>
			{({ reset }) => (
				<ErrorBoundary errorComponent={({ error, reset: resetBoundary }) => (
					<ErrorFallback
						error={error}
						reset={() => {
							reset();
							resetBoundary?.();
						}}
					/>
				)}>
					<Suspense fallback={
						<div className="min-h-60 space-y-4 border-b pb-8" role="status" aria-label={loadingLabel}>
							<div className="h-6 w-40 animate-pulse bg-muted" aria-hidden="true" />
							<div className="h-11 w-full max-w-md animate-pulse bg-muted" aria-hidden="true" />
							<span className="sr-only">{loadingLabel}…</span>
						</div>
					}>
						{children}
					</Suspense>
				</ErrorBoundary>
			)}
		</QueryErrorResetBoundary>
	);
}
