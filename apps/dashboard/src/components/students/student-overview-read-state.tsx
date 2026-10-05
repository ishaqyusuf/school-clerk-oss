"use client";

import { Button } from "@school-clerk/ui/button";

export function StudentOverviewReadState({ pending, onRetry }: { pending: boolean; onRetry: () => void }) {
  return (
    <div role={pending ? "status" : "alert"} aria-busy={pending}
      className="w-full min-w-0 space-y-3 rounded-lg border border-border p-4 sm:p-5">
      <h3 className="break-words text-sm font-medium">{pending ? "Loading student overview…" : "Student overview unavailable"}</h3>
      <p className="break-words text-sm text-muted-foreground">
        {pending ? "Checking the current school and permitted records."
          : "We could not confirm access to this student's records. Retry, or reload the page after changing schools or accounts. This read does not change any records."}
      </p>
      {!pending ? <Button type="button" variant="outline" onClick={onRetry} className="min-h-11 w-full sm:w-auto">Retry overview</Button> : null}
    </div>
  );
}
