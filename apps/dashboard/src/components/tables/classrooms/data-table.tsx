"use client";

import { useTRPC } from "@/trpc/client";
import {
  TableProvider,
  Table,
  useTableData,
} from "@school-clerk/ui/data-table";
import { columns, mobileColumn } from "./columns";
import { useClassroomFilterParams } from "@/hooks/use-classroom-filter-params";
import { useClassroomParams } from "@/hooks/use-classroom-params";
export function DataTable() {
  const trpc = useTRPC();
  // const { rowSelection, setRowSelection } = useClassroomStore();
  const { filters } = useClassroomFilterParams();
  const { data, ref, hasNextPage } = useTableData({
    filter: filters,
    route: trpc.academics.getClassrooms,
  });
  // const tableScroll = useTableScroll({
  //     useColumnWidths: true,
  //     startFromColumn: 2,
  // });

  const { setParams } = useClassroomParams();
  return (
    <TableProvider
      args={[
        {
          columns,
          mobileColumn,
          data,
          props: {
            hasNextPage,
            loadMoreRef: ref,
          },
          // tableScroll,
          // rowSelection,
          // setRowSelection,
          tableMeta: {
            rowClick(id, rowData) {
              //   overviewQuery.open2(rowData.uuid, "sales");
              setParams({
                viewClassroomId: rowData.id,
                classroomTab: "students",
              });
            },
          },
        },
      ]}
    >
      <div className="flex flex-col gap-4 w-full">
        <div
          // ref={tableScroll.containerRef}
          className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
        >
          <Table>
            <Table.Header />
            <Table.Body>
              <Table.Row />
            </Table.Body>
          </Table>
        </div>
        {hasNextPage && <Table.LoadMore />}
        {/* <BatchActions /> */}
      </div>
    </TableProvider>
  );
}
