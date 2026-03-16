"use client";

import React, { use } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useStaffParams } from "@/hooks/use-staff-params";
import { PageFilterData } from "@/types";

import { Button } from "@school-clerk/ui/button";
import { Table, TableBody } from "@school-clerk/ui/table";

import { TableProvider } from "..";
import { TableHeaderComponent } from "../table-header";
import { TableRow } from "../table-row";
import { columns } from "./columns";

type Props = {
  data: any[];
  loadMore: (query) => Promise<any>;
  pageSize: number;
  hasNextPage: boolean;
  filterDataPromise;
};

export function DataTable({
  data,
  loadMore,
  pageSize,
  hasNextPage,
  filterDataPromise,
}: Props) {
  const { setParams, ...params } = useStaffParams();
  const filterData: PageFilterData[] = filterDataPromise
    ? use(filterDataPromise)
    : [];
  const toast = useLoadingToast();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { mutate: deleteStaff } = useMutation(
    trpc.staff.deleteStaff.mutationOptions({
      onSuccess() {
        toast.success("Deleted!", { variant: "destructive" });
        qc.invalidateQueries({ queryKey: trpc.staff.getStaffList.queryKey() });
      },
    })
  );
  return (
    <TableProvider
      args={[
        {
          columns,
          data,
          hasNextPage,
          loadMore,
          pageSize,
          setParams,
          params,
          tableMeta: {
            deleteAction(id) {
              deleteStaff({ staffId: id });
            },
            rowClick(id, rowData) {
              setParams({
                staffViewId: id,
              });
            },
          },
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex">
          <MiddaySearchFilter placeholder={"Search"} filterList={filterData} />
          <div className="flex-1"></div>
          <Button
            variant="outline"
            onClick={() =>
              setParams({
                createStaff: true,
              })
            }
          >
            Create student
          </Button>
        </div>
        <Table>
          <TableHeaderComponent />

          <TableBody>
            <TableRow />
          </TableBody>
        </Table>
        {/* {hasNextPage && (
          <div className="mt-6 flex items-center justify-center" ref={ref}>
            <div className="flex items-center space-x-2 px-6 py-5">
              <Spinner />
              <span className="text-sm text-[#606060]">Loading more...</span>
            </div>
          </div>
        )} */}
      </div>
    </TableProvider>
  );
}
