"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@school-clerk/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@school-clerk/ui/dialog";
import { useStudentTermDetails } from "@/hooks/use-student-term-details";

type Props = {
  target: { termFormId: string; studentName: string } | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
  isPending: boolean;
  ready: boolean;
  error: Error | null;
};

function PreviewSection({ title, section, children }: {
  title: string;
  section: { status: "available" | "restricted" | "unavailable"; count: number | null; rows: readonly unknown[] };
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-2 rounded-md border p-3">
      <h3 className="flex flex-wrap justify-between gap-2 text-sm font-semibold">
        <span>{title}</span>
        <span>{section.status === "available" ? section.count : section.status === "restricted" ? "Restricted" : "Needs review"}</span>
      </h3>
      {section.status === "restricted" ? (
        <p className="text-xs text-muted-foreground">Your current role or module access does not include these records. Their contents and count are withheld.</p>
      ) : section.status === "unavailable" ? (
        <p className="text-xs text-muted-foreground">Linked records need integrity review. This is not confirmation that no records exist.</p>
      ) : section.count === 0 ? (
        <p className="text-xs text-muted-foreground">No current linked records.</p>
      ) : (
        <>
          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">{children}</ul>
          {section.count !== null && section.count > section.rows.length ? <p className="text-xs text-muted-foreground">Showing {section.rows.length} of {section.count} records.</p> : null}
        </>
      )}
    </section>
  );
}

export function StudentTermRemovalDialog({ target, onClose, onConfirm, isPending, ready, error }: Props) {
  const preview = useStudentTermDetails(target?.termFormId ?? null);
  const details = preview.data;
  const canConfirm = ready && !!details?.canRemove && !isPending;
  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open && !isPending) onClose(); }}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 text-destructive">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            Remove term enrollment
          </DialogTitle>
          <DialogDescription className="break-words">
            {details ? `Remove the term enrollment for ${details.studentName}? ` : "Review the current enrollment before removal. "}
            Only its term form is archived. Financial, assessment and attendance history is retained, and outstanding balances are not cancelled.
          </DialogDescription>
        </DialogHeader>

        {preview.isLoading ? <p role="status" className="py-4 text-sm text-muted-foreground">Loading current enrollment details…</p> : null}
        {preview.isUnavailable ? (
          <div role="alert" className="space-y-2 text-sm">
            <p>Enrollment details are unavailable. The record, workspace or permissions may have changed. Refresh before continuing.</p>
            <Button className="min-h-11 whitespace-normal" variant="outline" disabled={!preview.canRetry} onClick={preview.refresh}>Retry current preview</Button>
          </div>
        ) : null}
        {details ? (
          <div className="min-w-0 space-y-3 break-words">
            <p className="text-xs text-muted-foreground">Preview of non-archived linked records, up to {details.previewLimit} per section. Cancelled financial records retain their status. This is not a balance statement or deletion of the records below.</p>
            <PreviewSection title="Assessment scores" section={details.assessments}>
              {details.assessments.rows.map((row) => <li key={row.id} className="flex flex-wrap justify-between gap-2 border-t pt-2"><span className="min-w-0 flex-1">{row.subjectTitle} — {row.assessmentTitle}</span><span>{row.obtained}</span></li>)}
            </PreviewSection>
            <PreviewSection title="Attendance" section={details.attendance}>
              {details.attendance.rows.map((row) => <li key={row.id} className="flex flex-wrap justify-between gap-2 border-t pt-2"><span>{row.date ? new Date(row.date).toLocaleDateString() : "Date unavailable"}</span><span>{row.status}</span></li>)}
            </PreviewSection>
            <PreviewSection title="Charges" section={details.charges}>
              {details.charges.rows.map((row) => <li key={row.id} className="space-y-1 border-t pt-2"><p>{row.title}</p><p className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>Amount: {row.amount}</span><span>{row.status}</span></p></li>)}
            </PreviewSection>
            <PreviewSection title="Payment allocations" section={details.allocations}>
              {details.allocations.rows.map((row) => <li key={row.id} className="space-y-1 border-t pt-2"><p>Applied amount: {row.amount}</p><p className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{new Date(row.date).toLocaleDateString()}</span><span>{row.paymentStatus}</span></p></li>)}
            </PreviewSection>
            <p className="text-xs text-muted-foreground">Payment allocations show amounts linked to these charges, not whole receipts or unallocated payments. Restricted or inconsistent sections do not mean zero history.</p>
            {!details.canRemove ? <p role="status" className="text-sm text-destructive">This academic term is closed. Its enrollment cannot be removed.</p> : null}
          </div>
        ) : null}
        {error ? <p role="alert" className="break-words text-sm text-destructive">{error.message} Refresh the preview before retrying if the response was interrupted.</p> : null}
        {!ready ? <p role="status" className="text-sm text-muted-foreground">Your enrollment workspace is unavailable. Close this dialog and refresh.</p> : null}
        <DialogFooter className="gap-2">
          <Button className="min-h-11 whitespace-normal" variant="outline" disabled={isPending} onClick={onClose}>Cancel</Button>
          <Button className="min-h-11 whitespace-normal" variant="destructive" disabled={!canConfirm} onClick={() => { if (canConfirm && details) onConfirm(details.id); }}>
            {isPending ? "Removing…" : "Confirm removal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
