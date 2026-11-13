import { ErrorFallback } from "@/components/error-fallback";
import { ReportCardEditor } from "@/features/report-card/report-card-editor";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import type { Metadata } from "next";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: "Report Card Template",
};

export default function Page() {
	prefetch(trpc.reportCards.getTemplate.queryOptions());
	return (
		<HydrateClient>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense
					fallback={
						<p className="py-8 text-sm text-muted-foreground">
							Loading template…
						</p>
					}
				>
					<ReportCardEditor />
				</Suspense>
			</ErrorBoundary>
		</HydrateClient>
	);
}
