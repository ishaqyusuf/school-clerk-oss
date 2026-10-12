import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { AssistantPageWorkspace } from "@/components/assistant/assistant-page-workspace";
import { requireDashboardModules } from "@/lib/module-access";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
export const metadata = { title: "Assistant" };
export default async function Page() {
	await requireDashboardModules(["AI_ASSISTANT"], ["Admin"]);
	batchPrefetch([trpc.assistant.bootstrap.queryOptions()]);
	return (
		<HydrateClient>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<p>Loading Assistant…</p>}>
					<AssistantPageWorkspace />
				</Suspense>
			</ErrorBoundary>
		</HydrateClient>
	);
}
