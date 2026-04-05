"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useTermBillableParams } from "@/hooks/use-term-billable-params";
import { Button } from "@school-clerk/ui/button";
import { Table } from "@school-clerk/ui/data-table";
import { EmptyState } from "./empty-states";
import { buildColumns, type Item } from "./columns";
import { ApplyDiscountDialog } from "./apply-discount-dialog";
import { useState } from "react";

export function DataTable() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(
    trpc.transactions.getStudentFees.queryOptions()
  );
  const { setParams, ...params } = useTermBillableParams();
  const [discountTarget, setDiscountTarget] = useState<Item | null>(null);

  const columns = buildColumns((item) => setDiscountTarget(item));

  if (!data?.length) {
    return <EmptyState />;
  }

  return (
    <>
      <Table.Provider
        args={[
          {
            setParams,
            params,
            columns,
            tableMeta: {
              deleteAction() {},
              rowClick() {
                setParams({});
              },
            },
            data,
          },
        ]}
      >
        <div className="flex flex-col gap-4">
          <div className="flex">
            <MiddaySearchFilter
              placeholder="Search"
              filterList={[
                {
                  value: "search",
                  icon: "Search",
                  type: "input",
                },
              ]}
            />
            <div className="flex-1"></div>
            <Button
              variant="outline"
              onClick={() => {
                setParams({});
              }}
            >
              Create Bill
            </Button>
          </div>
          <Table>
            <Table.Header />
            <Table.Body>
              <Table.Row />
            </Table.Body>
          </Table>
        </div>
      </Table.Provider>

      {discountTarget && (
        <ApplyDiscountDialog
          studentFeeId={discountTarget.id}
          pendingAmount={discountTarget.pendingAmount}
          feeTitle={discountTarget.feeTitle}
          studentName={discountTarget.studentName}
          onClose={() => setDiscountTarget(null)}
          onSuccess={() => {
            setDiscountTarget(null);
            qc.invalidateQueries({
              queryKey: trpc.transactions.getStudentFees.queryKey(),
            });
          }}
        />
      )}
    </>
  );
}
