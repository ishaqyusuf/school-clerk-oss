"use client";

import { useStudentFilterParams } from "@/hooks/use-student-filter-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/custom/icons";
import { Table, useTableData } from "@school-clerk/ui/data-table";
import { columns } from "./columns";

export function DataTable() {
  const trpc = useTRPC();
  const { filter } = useStudentFilterParams();
  const { data, ref, hasNextPage } = useTableData({
    filter,
    route: trpc.enrollments.index as any,
  });

  return (
    <Table.Provider
      args={[
        {
          columns,
          data,
          props: {
            loadMoreRef: ref,
            hasNextPage,
          },
          tableMeta: {
            deleteAction() {},
            rowClick() {},
          },
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <div className="flex">
          <div className="flex-1"></div>
          <Button className="whitespace-nowrap" variant="outline">
            <Icons.add className="mr-2 size-4" />
            New Student
          </Button>
        </div>
        <Table dir="rtl">
          <Table.Header />
          <Table.Body>
            <Table.Row />
          </Table.Body>
        </Table>
        <Table.LoadMore />
      </div>
    </Table.Provider>
  );
}
