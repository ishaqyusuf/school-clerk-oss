"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@school-clerk/ui/sheet";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

type InventoryType = "SUPPLY" | "TEXTBOOK" | "EQUIPMENT" | "UNIFORM" | "OTHER";

interface Props {
  itemId: string | null;
  existingItem?: {
    title: string;
    description?: string | null;
    type: string;
    quantity: number;
    unitPrice: number;
    lowStockAlert: number;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function InventoryItemSheet({
  itemId,
  existingItem,
  onClose,
  onSuccess,
}: Props) {
  const trpc = useTRPC();
  const [title, setTitle] = useState(existingItem?.title ?? "");
  const [description, setDescription] = useState(
    existingItem?.description ?? "",
  );
  const [type, setType] = useState<InventoryType>(
    (existingItem?.type as InventoryType) ?? "OTHER",
  );
  const [quantity, setQuantity] = useState(
    existingItem?.quantity?.toString() ?? "0",
  );
  const [unitPrice, setUnitPrice] = useState(
    existingItem?.unitPrice?.toString() ?? "0",
  );
  const [lowStockAlert, setLowStockAlert] = useState(
    existingItem?.lowStockAlert?.toString() ?? "5",
  );

  const { mutate, isPending } = useMutation(
    trpc.inventory.createItem.mutationOptions({ onSuccess }),
  );

  const handleSubmit = () => {
    if (!title.trim()) return;
    mutate({
      id: itemId ?? undefined,
      title: title.trim(),
      description: description || undefined,
      type,
      quantity: parseInt(quantity, 10) || 0,
      unitPrice: parseFloat(unitPrice) || 0,
      lowStockAlert: parseInt(lowStockAlert, 10) || 5,
    });
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{itemId ? "Edit Item" : "Add Inventory Item"}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-6">
          <div className="flex flex-col gap-1.5">
            <Label>Title *</Label>
            <Input
              placeholder="e.g. Mathematics Textbook"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Description</Label>
            <Input
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as InventoryType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SUPPLY">Supply</SelectItem>
                <SelectItem value="TEXTBOOK">Textbook</SelectItem>
                <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                <SelectItem value="UNIFORM">Uniform</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Unit Price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Low Stock Alert (quantity)</Label>
            <Input
              type="number"
              min="0"
              value={lowStockAlert}
              onChange={(e) => setLowStockAlert(e.target.value)}
            />
          </div>

          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={isPending || !title.trim()}
              onClick={handleSubmit}
            >
              {itemId ? "Update" : "Add Item"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
