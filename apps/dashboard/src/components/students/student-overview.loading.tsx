import { cn } from "@school-clerk/ui/cn";
import { Skeleton } from "@school-clerk/ui/skeleton";

/** Section skeletons that mirror the flat Overview tab layout. */
export function StudentOverviewSectionsSkeleton() {
  return (
    <div className="@container divide-y divide-border" aria-hidden>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-5 @2xl:grid-cols-4">
        {["id", "class", "term", "gender"].map((key) => (
          <div key={key} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      {["enrollment", "history"].map((key) => (
        <div key={key} className="space-y-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            {key === "enrollment" ? <Skeleton className="h-11 w-28" /> : null}
          </div>
          {key === "history"
            ? ["one", "two", "three"].map((row) => (
                <div key={row} className="flex items-center justify-between gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))
            : null}
        </div>
      ))}
    </div>
  );
}

/** Full student sheet/page skeleton: header, tabs and the Overview sections. */
export function StudentOverviewSkeleton({ mode = "sheet" }: { mode?: "sheet" | "page" }) {
  return (
    <div
      aria-busy="true"
      className={cn(
        "flex w-full min-w-0 flex-col gap-4 sm:gap-6",
        mode === "page" && "mx-auto max-w-7xl",
      )}
    >
      <div className="flex flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full sm:h-16 sm:w-16" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <div className="flex gap-6 border-b border-border pb-3">
        {["overview", "academics", "attendance", "payments"].map((tab) => (
          <Skeleton key={tab} className="h-4 w-20" />
        ))}
      </div>
      <StudentOverviewSectionsSkeleton />
      <output className="sr-only">Loading student overview…</output>
    </div>
  );
}
