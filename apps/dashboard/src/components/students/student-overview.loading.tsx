import { cn } from "@school-clerk/ui/cn";
import { Skeleton } from "@school-clerk/ui/skeleton";

const DETAIL_KEYS = ["one", "two", "three", "four"];

function DetailsSkeleton({ count = 4, large = false }: { count?: number; large?: boolean }) {
  return (
    <div className="@container py-5">
      <div
        className={cn(
          "grid gap-x-6 gap-y-4",
          count === 3 ? "grid-cols-3" : "grid-cols-2 @2xl:grid-cols-4",
        )}
      >
        {DETAIL_KEYS.slice(0, count).map((key) => (
          <div key={key} className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className={cn("w-24", large ? "h-6" : "h-4")} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeadingSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-64 max-w-full" />
      </div>
      {action ? <Skeleton className="h-9 w-28" /> : null}
    </div>
  );
}

function ListSkeleton({ rows = 3, trailing = "badge" }: { rows?: number; trailing?: "badge" | "amount" }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }, (_, index) => `row-${index}`).map((key) => (
        <div key={key} className="flex items-center justify-between gap-4 py-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48 max-w-full" />
          </div>
          {trailing === "amount" ? (
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-14 rounded-sm" />
            </div>
          ) : (
            <Skeleton className="h-5 w-20 rounded-sm" />
          )}
        </div>
      ))}
    </div>
  );
}

/** Section skeletons that mirror the flat Overview tab layout. */
export function StudentOverviewSectionsSkeleton() {
  return (
    <div className="divide-y divide-border" aria-hidden>
      <DetailsSkeleton />
      <div className="space-y-4 py-6">
        <SectionHeadingSkeleton action />
      </div>
      <div className="space-y-4 py-6">
        <SectionHeadingSkeleton />
        <ListSkeleton />
      </div>
    </div>
  );
}

/** Academics tab: enrollment details and a short note. */
export function StudentAcademicsSkeleton() {
  return (
    <div className="divide-y divide-border" aria-hidden>
      <DetailsSkeleton />
      <div className="space-y-3 py-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
    </div>
  );
}

/** Attendance tab: rate figures and the session list. */
export function StudentAttendanceSkeleton() {
  return (
    <div className="divide-y divide-border" aria-hidden>
      <DetailsSkeleton large />
      <div className="space-y-4 py-6">
        <SectionHeadingSkeleton />
        <ListSkeleton rows={5} />
      </div>
    </div>
  );
}

/** Payments tab: heading with actions, totals, fees and transactions. */
export function StudentPaymentsSkeleton() {
  return (
    <div className="divide-y divide-border" aria-hidden>
      <div className="py-6">
        <SectionHeadingSkeleton action />
      </div>
      <div className="space-y-3">
        <DetailsSkeleton count={3} large />
        <Skeleton className="mb-5 h-1 w-full" />
      </div>
      <div className="space-y-4 py-6">
        <SectionHeadingSkeleton />
        <ListSkeleton rows={2} trailing="amount" />
      </div>
      <div className="space-y-4 py-6">
        <SectionHeadingSkeleton />
        <ListSkeleton rows={3} trailing="amount" />
      </div>
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
