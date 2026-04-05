"use client";

import { useTRPC } from "@/trpc/client";
import { AnimatedNumber } from "@/components/animated-number";
import { Button } from "@school-clerk/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@school-clerk/ui/dialog";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

interface Props {
  studentFeeId: string;
  pendingAmount: number;
  feeTitle?: string | null;
  studentName?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplyDiscountDialog({
  studentFeeId,
  pendingAmount,
  feeTitle,
  studentName,
  onClose,
  onSuccess,
}: Props) {
  const trpc = useTRPC();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const { mutate, isPending, error } = useMutation(
    trpc.finance.applyDiscount.mutationOptions({ onSuccess }),
  );

  const parsedAmount = parseFloat(amount);
  const isValid =
    !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= pendingAmount;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {studentName && (
            <p className="text-sm text-muted-foreground">
              Student: <strong>{studentName}</strong>
              {feeTitle && (
                <>
                  {" "}
                  — <span>{feeTitle}</span>
                </>
              )}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Pending balance:{" "}
            <strong className="font-mono">
              <AnimatedNumber value={pendingAmount} />
            </strong>
          </p>
          <div className="flex flex-col gap-1.5">
            <Label>Discount Amount *</Label>
            <Input
              type="number"
              min="0.01"
              max={pendingAmount}
              step="0.01"
              placeholder={`Max ${pendingAmount}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Reason (optional)</Label>
            <Input
              placeholder="e.g. Scholarship, sibling discount"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">
              {(error as any).message || "Failed to apply discount"}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={isPending || !isValid}
            onClick={() =>
              mutate({
                studentFeeId,
                amount: parsedAmount,
                reason: reason || undefined,
              })
            }
          >
            Apply Discount
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
