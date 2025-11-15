"use client";

import React, { useEffect, useState } from "react";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";

import { useSchoolFeeParams } from "@/hooks/use-school-fee-params";
import {
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useInView } from "react-intersection-observer";

import { Button } from "@school-clerk/ui/button";
import { Spinner } from "@school-clerk/ui/spinner";
import { Table, TableBody } from "@school-clerk/ui/table";

import { TableProvider } from "..";
import { TableRow } from "../table-row";
import { columns, Item } from "./columns";

type Props = {
  data: Item[];
  loadMore: (query) => Promise<any>;
  pageSize: number;
  hasNextPage: boolean;
};

export function DataTable({ data, loadMore, pageSize, hasNextPage }: Props) {
  const { setParams } = useSchoolFeeParams();

  //   const deleteInvoice = useAction(deleteInvoiceAction);
  //   const { date_format: dateFormat } = useUserContext((state) => state.data);

  // const selectedInvoice = data.find((invoice) => invoice?.id === invoiceId);

  const handleDeleteInvoice = (id: string) => {
    // setData((prev) => {
    //   return prev.filter((item) => item.id !== id);
    // });
    // deleteInvoice.execute({ id });
  };

  return (
    <TableProvider
      args={[
        {
          setParams,

          columns,
          tableMeta: {
            deleteAction: handleDeleteInvoice,
            rowClick(id, rowData) {
              setParams({});
            },
          },
          pageSize,
          hasNextPage,
          data,
          loadMore,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex">
          <MiddaySearchFilter
            placeholder={"Search"}
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
            onClick={() =>
              setParams({
                createSchoolFee: true,
              })
            }
          >
            Create Fee
          </Button>
        </div>
        <Table>
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
