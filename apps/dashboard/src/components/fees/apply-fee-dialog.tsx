"use client";

import { useTRPC } from "@/trpc/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@school-clerk/ui/alert-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@school-clerk/ui/use-toast";

type Props = {
  feeHistoryId: string | null;
  onClose: () => void;
};

export function ApplyFeeDialog({ feeHistoryId, onClose }: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();

  const { data: preview, isLoading } = useQuery({
    ...trpc.transactions.getFeeApplyPreview.queryOptions({
      feeHistoryId: feeHistoryId ?? "",
    }),
    enabled: Boolean(feeHistoryId),
  });

  const { mutate, isPending } = useMutation(
    trpc.transactions.applyFeeToClass.mutationOptions({
      onSuccess(data) {
        qc.invalidateQueries({
          queryKey: trpc.transactions.getStudentFees.queryKey(),
        });
        qc.invalidateQueries({
          queryKey: trpc.transactions.studentAccounting.queryKey(),
        });
        qc.invalidateQueries({
          queryKey: trpc.students.overview.queryKey(),
        });
        toast.success(
          `${data.applied} student${data.applied !== 1 ? "s" : ""} applied${data.skipped ? `, ${data.skipped} already had this fee` : ""}.`,
        );
        onClose();
      },
    }),
  );

  return (
    <AlertDialog
      open={Boolean(feeHistoryId)}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apply fee to students</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading preview...
                </p>
              ) : preview ? (
                <>
                  <p className="text-sm">
                    This will apply{" "}
                    <span className="font-semibold">{preview.feeTitle}</span>{" "}
                    (NGN {Number(preview.amount).toLocaleString()}) to eligible
                    students.
                  </p>
                  <div className="space-y-1.5 rounded-lg border bg-muted/40 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scope</span>
                      <span className="font-medium">
                        {preview.isAllClasses
                          ? "All classes"
                          : preview.classrooms
                              .map((c) => c.departmentName)
                              .filter(Boolean)
                              .join(", ")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Eligible students
                      </span>
                      <span className="font-medium">
                        {preview.eligibleStudents}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Already applied
                      </span>
                      <span className="font-medium text-green-600">
                        {preview.alreadyApplied}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1.5">
                      <span className="font-medium">Will be applied to</span>
                      <span className="font-semibold text-primary">
                        {preview.toApply} students
                      </span>
                    </div>
                  </div>
                  {preview.toApply === 0 && (
                    <p className="text-sm text-green-600">
                      All eligible students already have this fee applied.
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={
              isPending || isLoading || !preview || preview.toApply === 0
            }
            onClick={() => feeHistoryId && mutate({ feeHistoryId })}
          >
            {isPending
              ? "Applying..."
              : `Apply to ${preview?.toApply ?? "..."} students`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
