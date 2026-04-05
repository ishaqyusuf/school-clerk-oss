"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@school-clerk/ui/card";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  AlertTriangle,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { InventoryItemSheet } from "./inventory-item-sheet";
import { IssueItemSheet } from "./issue-item-sheet";

const TYPE_LABELS: Record<string, string> = {
  SUPPLY: "Supply",
  TEXTBOOK: "Textbook",
  EQUIPMENT: "Equipment",
  UNIFORM: "Uniform",
  OTHER: "Other",
};

export function InventoryDashboard() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState<string | "new" | null>(null);
  const [issueItemId, setIssueItemId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const { data: items } = useSuspenseQuery(
    trpc.inventory.getItems.queryOptions({}),
  );

  const { mutate: deleteItem } = useMutation(
    trpc.inventory.deleteItem.mutationOptions({
      onSuccess: () =>
        qc.invalidateQueries({
          queryKey: trpc.inventory.getItems.queryKey({}),
        }),
    }),
  );

  const filtered =
    typeFilter === "ALL"
      ? items
      : items.filter((i) => i.type === typeFilter);

  const lowStockCount = items.filter((i) => i.isLowStock).length;
  const totalItems = items.length;
  const totalValue = items.reduce(
    (s, i) => s + i.quantity * i.unitPrice,
    0,
  );

  const types = ["ALL", ...Array.from(new Set(items.map((i) => i.type)))];

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              {totalItems}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              Stock Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-lg font-semibold">
              <AnimatedNumber value={totalValue} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground font-normal">
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold flex items-center gap-2">
              {lowStockCount > 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-600">{lowStockCount}</span>
                </>
              ) : (
                <span className="text-green-600">All OK</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2 flex-1 flex-wrap">
          {types.map((t) => (
            <Button
              key={t}
              variant={typeFilter === t ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setTypeFilter(t)}
            >
              {t === "ALL" ? "All" : TYPE_LABELS[t] ?? t}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          onClick={() => setEditItem("new")}
          className="flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Items list */}
      <Card>
        <CardContent className="p-0">
          {!filtered.length ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-3 h-8 w-8 opacity-30" />
              No inventory items found.
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.title}</span>
                      {item.isLowStock && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] h-4 px-1.5 bg-orange-100 text-orange-700 hover:bg-orange-100"
                        >
                          Low stock
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.description}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {TYPE_LABELS[item.type] ?? item.type}
                      </Badge>
                      <span>
                        Qty: <strong>{item.quantity}</strong>
                      </span>
                      {item.unitPrice > 0 && (
                        <span className="font-mono">
                          @ <AnimatedNumber value={item.unitPrice} />
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIssueItemId(item.id)}
                    >
                      Issue
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditItem(item.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete "${item.title}"? This cannot be undone.`,
                          )
                        ) {
                          deleteItem({ id: item.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editItem && (
        <InventoryItemSheet
          itemId={editItem === "new" ? null : editItem}
          existingItem={
            editItem !== "new"
              ? items.find((i) => i.id === editItem) ?? null
              : null
          }
          onClose={() => setEditItem(null)}
          onSuccess={() => {
            setEditItem(null);
            qc.invalidateQueries({
              queryKey: trpc.inventory.getItems.queryKey({}),
            });
          }}
        />
      )}

      {issueItemId && (
        <IssueItemSheet
          inventoryId={issueItemId}
          itemTitle={items.find((i) => i.id === issueItemId)?.title ?? "Item"}
          onClose={() => setIssueItemId(null)}
          onSuccess={() => {
            setIssueItemId(null);
            qc.invalidateQueries({
              queryKey: trpc.inventory.getItems.queryKey({}),
            });
          }}
        />
      )}
    </div>
  );
}
