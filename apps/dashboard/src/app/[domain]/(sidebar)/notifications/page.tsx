import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { ErrorFallback } from "@/components/error-fallback";
import { NotificationsPageClient } from "@/components/notifications/notifications-page";
import { TableSkeleton } from "@/components/tables/skeleton";
import { PageTitle } from "@school-clerk/ui/custom/page-title";

export default function Page() {
	return (
		<div className="flex flex-col gap-6">
			<PageTitle>Notifications</PageTitle>
			<ErrorBoundary errorComponent={ErrorFallback}>
				<Suspense fallback={<TableSkeleton />}>
					<NotificationsPageClient />
				</Suspense>
			</ErrorBoundary>
		</div>
	);
}
