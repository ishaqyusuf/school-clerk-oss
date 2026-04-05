"use client";

import { AnimatedNumber } from "@/components/animated-number";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";

export type Item = {
  id: string;
  feeTitle?: string | null;
  description?: string | null;
  billAmount: number;
  pendingAmount: number;
  collectionStatus?: string | null;
  studentName?: string | null;
};

function CollectionStatusBadge({ status }: { status?: string | null }) {
  if (!status || status === "PENDING") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] h-4 px-1.5 text-orange-700 border-orange-300"
      >
        Unpaid
      </Badge>
    );
  }
  if (status === "PARTIAL") {
    return (
      <Badge className="text-[10px] h-4 px-1.5 bg-blue-100 text-blue-800 hover:bg-blue-100">
        Partial
      </Badge>
    );
  }
  if (status === "PAID") {
    return (
      <Badge className="text-[10px] h-4 px-1.5 bg-green-100 text-green-800 hover:bg-green-100">
        Paid
      </Badge>
    );
  }
  if (status === "WAIVED") {
    return (
      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
        Waived
      </Badge>
    );
  }
  if (status === "OVERDUE") {
    return (
      <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
        Overdue
      </Badge>
    );
  }
  return null;
}

export function buildColumns(
  onApplyDiscount: (item: Item) => void,
): ColumnDef<Item>[] {
  return [
    {
      header: "Student / Fee",
      accessorKey: "billable",
      cell: ({ row: { original: item } }) => (
        <div>
          <div className="font-medium text-sm">{item.studentName}</div>
          <div className="text-xs text-muted-foreground">{item.feeTitle}</div>
          {item.description && (
            <div className="text-xs text-muted-foreground">{item.description}</div>
          )}
        </div>
      ),
    },
    {
      header: "Amount",
      accessorKey: "amount",
      meta: { className: "w-28" },
      cell: ({ row: { original: item } }) => (
        <div className="font-mono text-sm">
          <AnimatedNumber value={item.billAmount} />
        </div>
      ),
    },
    {
      header: "Pending",
      accessorKey: "pending",
      meta: { className: "w-28" },
      cell: ({ row: { original: item } }) => (
        <div
          className={cn(
            "font-mono text-sm",
            item.pendingAmount > 0 ? "text-orange-600" : "text-green-600",
          )}
        >
          <AnimatedNumber value={item.pendingAmount} />
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "collectionStatus",
      meta: { className: "w-24" },
      cell: ({ row: { original: item } }) => (
        <CollectionStatusBadge status={item.collectionStatus} />
      ),
    },
    {
      header: "",
      accessorKey: "action",
      meta: { className: "w-28" },
      cell: ({ row: { original: item } }) =>
        item.pendingAmount > 0 && item.collectionStatus !== "WAIVED" ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onApplyDiscount(item);
            }}
          >
            Discount
          </Button>
        ) : null,
    },
  ];
}

// Keep legacy export for backward compat
export const columns: ColumnDef<Item>[] = buildColumns(() => {});
