"use client";

import { useTRPC } from "@/trpc/client";
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
  onClose: () => void;
  onSuccess: () => void;
}

export function WaiveFeeDialog({ studentFeeId, onClose, onSuccess }: Props) {
  const trpc = useTRPC();
  const [reason, setReason] = useState("");

  const { mutate, isPending } = useMutation(
    trpc.finance.waiveFee.mutationOptions({
      onSuccess,
    }),
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Waive Fee</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm text-muted-foreground">
            This will mark the fee as waived and zero out the pending balance.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label>Reason (optional)</Label>
            <Input
              placeholder="e.g. Scholarship, financial hardship"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={() =>
              mutate({ studentFeeId, reason: reason || undefined })
            }
          >
            Waive Fee
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
