"use client";

import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@school-clerk/ui/badge";
import { AlertTriangle, Import } from "lucide-react";
import type { StudentImportReviewCounts } from "./review-model";

type Props = {
  counts: StudentImportReviewCounts;
  disabledReason: string | null;
  isVerifying: boolean;
  isExecuting: boolean;
  canStartImport: boolean;
  actionLabel: string;
  onExecute: () => void;
};

export function StudentImportReviewFooter({
  counts, disabledReason, isVerifying, isExecuting, canStartImport, actionLabel, onExecute,
}: Props) {
  return (
    <footer className="shrink-0 border-t bg-background pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1" role="status" aria-live="polite" aria-atomic="true">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{counts.totalRows} total</span>
            <Badge variant="secondary">{counts.checkedRows} checked</Badge>
            <span>{counts.executableRows} executable</span>
            <span>{counts.blockedCheckedRows} blocked</span>
            <span>{counts.uncheckedRows} unchecked</span>
            <span>{counts.skippedRows} skipped</span>
          </div>
          {disabledReason ? (
            <p id="student-import-readiness" className="flex items-start gap-1.5 break-words text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{disabledReason}</span>
            </p>
          ) : null}
        </div>
        <SubmitButton
          isSubmitting={isExecuting}
          disabled={!canStartImport || isVerifying || isExecuting}
          aria-describedby={disabledReason ? "student-import-readiness" : undefined}
          onClick={onExecute}
          className="h-11 w-full shrink-0 justify-center font-medium sm:w-auto"
          type="button"
        >
          <Import className="mr-2 size-4" aria-hidden="true" />
          {isExecuting ? "Importing..." : actionLabel}
        </SubmitButton>
      </div>
    </footer>
  );
}

