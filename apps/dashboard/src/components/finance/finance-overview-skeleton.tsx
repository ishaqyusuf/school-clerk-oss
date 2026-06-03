import { Skeleton } from "@school-clerk/ui/skeleton";
import { DataTableSkeleton } from "@/components/tables/finance-streams/skeleton";

export function FinanceOverviewSkeleton() {
	return (
		<div className="space-y-6 p-6">
			<div className="space-y-2">
				<Skeleton className="h-7 w-36" />
				<Skeleton className="h-4 w-80 max-w-full" />
			</div>
			<div className="grid gap-3 md:grid-cols-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<div key={index.toString()} className="rounded-md border bg-background p-4">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="mt-3 h-8 w-36" />
					</div>
				))}
			</div>
			<div className="grid gap-3 lg:grid-cols-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<div key={index.toString()} className="rounded-md border bg-background p-4">
						<Skeleton className="h-4 w-28" />
						<div className="mt-3 space-y-3">
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-9 w-full" />
						</div>
					</div>
				))}
			</div>
			<DataTableSkeleton />
		</div>
	);
}
