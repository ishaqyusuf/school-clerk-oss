"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useBillParams } from "@/hooks/use-bill-params";
import { Button } from "@school-clerk/ui/button";
import { Table } from "@school-clerk/ui/data-table";
import { EmptyState } from "./empty-states";
import { columns } from "./columns";

export function DataTable() {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.finance.getBills.queryOptions());
  const { setParams, ...params } = useBillParams();

  if (!data?.length) {
    return <EmptyState />;
  }

  return (
    <Table.Provider
      args={[
        {
          checkbox: true,
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
              setParams({
                createBill: true,
              });
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
  );
}
