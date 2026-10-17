"use client";

import { SubmitButton } from "@/components/submit-button";
import { Import } from "lucide-react";
import type { StudentImportReviewCounts } from "./review-model";

type Props = {
  counts: StudentImportReviewCounts;
  disabledReason: string | null;
  isVerifying: boolean;
  isExecuting: boolean;
  canStartImport: boolean;
  actionLabel: string;
  onExecute: () => void;
  /** One-click fix for "checked rows need attention": untick the blocked rows. */
  onUncheckBlocked?: () => void;
};

export function StudentImportReviewFooter({
  counts,
  disabledReason,
  isVerifying,
  isExecuting,
  canStartImport,
  actionLabel,
  onExecute,
  onUncheckBlocked,
}: Props) {
  const blocked = counts.blockedCheckedRows;

  return (
    <footer className="shrink-0 border-t bg-background pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3">
        <div
          className="min-w-0 flex-1 text-xs"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <p className="truncate text-muted-foreground">
            {counts.checkedRows} selected
            {counts.skippedRows ? ` · ${counts.skippedRows} skipped` : ""}
          </p>
          {blocked > 0 ? (
            <p
              id="student-import-readiness"
              className="mt-0.5 text-amber-700 dark:text-amber-300"
            >
              {blocked} checked row{blocked === 1 ? "" : "s"} need attention
              {onUncheckBlocked ? (
                <>
                  {" · "}
                  <button
                    type="button"
                    className="font-medium underline underline-offset-2 hover:no-underline"
                    onClick={onUncheckBlocked}
                  >
                    untick {blocked === 1 ? "it" : "them"}
                  </button>
                </>
              ) : null}
            </p>
          ) : disabledReason ? (
            <p id="student-import-readiness" className="mt-0.5 text-muted-foreground">
              {disabledReason}
            </p>
          ) : null}
        </div>
        <SubmitButton
          isSubmitting={isExecuting}
          disabled={!canStartImport || isVerifying || isExecuting}
          aria-describedby={disabledReason ? "student-import-readiness" : undefined}
          onClick={onExecute}
          className="h-11 shrink-0 justify-center font-medium sm:h-10"
          type="button"
        >
          <Import className="mr-2 size-4" aria-hidden="true" />
          {isExecuting ? "Importing..." : actionLabel}
        </SubmitButton>
      </div>
    </footer>
  );
}
