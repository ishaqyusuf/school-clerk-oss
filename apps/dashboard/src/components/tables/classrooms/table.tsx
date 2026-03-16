"use client";

import React, { useEffect } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useLoadingToast } from "@/hooks/use-loading-toast";

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
};

export function DataTable({ data, loadMore, pageSize, hasNextPage }: Props) {
  const classQueryState = useClassroomParams();
  const { setParams, ...params } = classQueryState;
  // __classQueryState.context = classQueryState;
  // useEffect(() => {}, []);
  const toast = useLoadingToast();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { mutate: deleteDepartment } = useMutation(
    trpc.classrooms.deleteClassroomDepartment.mutationOptions({
      onSuccess() {
        toast.success("Deleted!", { variant: "destructive" });
        qc.invalidateQueries({ queryKey: trpc.classrooms.all.queryKey({}) });
      },
    })
  );
  const handleDeleteInvoice = (id: string) => {
    deleteDepartment({ id });
  };

  return (
    <TableProvider
      args={[
        {
          setParams,
          params,
          columns,
          tableMeta: {
            deleteAction: handleDeleteInvoice,
            // rowClick(id, rowData) {
            //   setParams({
            //     viewClassroomId: id,
            //   });
            // },
          },
          pageSize,
          hasNextPage,
          data,
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex">
          <div className="flex-1"></div>
          <Button
            variant="outline"
            onClick={() =>
              setParams({
                createClassroom: true,
              })
            }
          >
            Create invoice
          </Button>
        </div>
        <Table className="table-fixed">
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
