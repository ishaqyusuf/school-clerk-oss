"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@school-clerk/ui/sheet";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

interface Props {
  inventoryId: string;
  itemTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function IssueItemSheet({ inventoryId, itemTitle, onClose, onSuccess }: Props) {
  const trpc = useTRPC();
  const [quantity, setQuantity] = useState("1");
  const [issuedTo, setIssuedTo] = useState("");
  const [note, setNote] = useState("");

  const { mutate, isPending, error } = useMutation(
    trpc.inventory.issueItem.mutationOptions({ onSuccess }),
  );

  const handleSubmit = () => {
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) return;
    mutate({
      inventoryId,
      quantity: qty,
      issuedTo: issuedTo || undefined,
      note: note || undefined,
    });
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Issue Item</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-6">
          <p className="text-sm text-muted-foreground">
            Issuing from: <strong>{itemTitle}</strong>
          </p>

          <div className="flex flex-col gap-1.5">
            <Label>Quantity *</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Issued To</Label>
            <Input
              placeholder="Student name, class, or staff name"
              value={issuedTo}
              onChange={(e) => setIssuedTo(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Note</Label>
            <Input
              placeholder="Optional note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {(error as any).message || "Failed to issue item"}
            </p>
          )}

          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={
                isPending || !quantity || parseInt(quantity, 10) <= 0
              }
              onClick={handleSubmit}
            >
              Issue
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
