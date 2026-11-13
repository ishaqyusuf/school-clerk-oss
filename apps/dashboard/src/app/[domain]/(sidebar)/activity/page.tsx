import { ActivityFeed } from "@/components/activity/activity-feed";
import { ErrorFallback } from "@/components/error-fallback";
import { buildTenantPageMetadata } from "@/utils/tenant-page-metadata";
import { PageTitle } from "@school-clerk/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

export async function generateMetadata({ params }) {
	const { domain } = await params;
	return buildTenantPageMetadata({
		domain,
		pathname: "/activity",
	});
}

export default function Page() {
	return (
		<div className="flex animate-in flex-col gap-2 py-6 fade-in duration-500">
			<PageTitle>Activity</PageTitle>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense>
					<ActivityFeed />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
