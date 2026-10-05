"use client";

import { Button } from "@school-clerk/ui/button";

export function StudentHistoryUnavailable({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div role="status" className="w-full min-w-0 space-y-3 rounded-lg border border-border p-4 sm:p-5">
      <h3 className="break-words text-sm font-medium">Enrollment history needs review</h3>
      <p className="break-words text-sm text-muted-foreground">
        Existing records could not be matched to one valid enrollment for this term.
        This does not mean the student is not enrolled. Ask a school administrator to
        review the records before creating, moving, or deleting an enrollment.
      </p>
      <Button type="button" variant="outline" onClick={onRefresh} className="min-h-11 w-full whitespace-normal sm:w-auto">
        Refresh history
      </Button>
    </div>
  );
}
