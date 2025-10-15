"use client";

import { useTRPC } from "@/trpc/client";
import { columns, mobileColumn } from "./columns";
import { useSubjectFilterParams } from "@/hooks/use-subject-filter-params";
import { useSubjectParams } from "@/hooks/use-subject-params";
import { useTableData, Table } from "@school-clerk/ui/data-table";
import { NoResults } from "@school-clerk/ui/custom/no-results";
import { EmptyState } from "@school-clerk/ui/custom/empty-state";
import { useTableScroll } from "@school-clerk/ui/hooks/use-table-scroll";
import { GetSubjectsSchema } from "@api/trpc/schemas/students";
import { cn } from "@school-clerk/ui/cn";
import { AnimatePresence } from "framer-motion";
import { GridCard } from "./grid-card";

interface Props {
  defaultFilters?: GetSubjectsSchema;
  onCreate?;
  className?: string;
  grid?: boolean;
  onClick?;
}
export function DataTable(props: Props) {
  // const { rowSelection, setRowSelection } = useBacklogStore();
  const trpc = useTRPC();
  const { filters, hasFilters, setFilters } = useSubjectFilterParams();
  const { data, ref, hasNextPage, isFetching } = useTableData({
    filter: {
      ...filters,
      ...(props.defaultFilters || {}),
    },
    route: trpc.subjects.getSubjects,
  });
  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 2,
  });
  const { setParams } = useSubjectParams();

  if (hasFilters && !data?.length) {
    return <NoResults setFilter={setFilters} />;
  }

  if (!data?.length && !isFetching) {
    return <EmptyState onCreate={props?.onCreate || ((e) => {})} />;
  }
  return (
    <Table.Provider
      args={[
        {
          columns,
          // mobileColumn,
          data,
          props: {
            loadMoreRef: ref,
            hasNextPage,
          },
          tableScroll,
          // rowSelection,
          // setRowSelection,
          tableMeta: {
            // rowClick(id, rowData) {
            //   //   overviewQuery.open2(rowData.uuid, "sales");
            //   setParams({
            //     //
            //   });
            // },
          },
        },
      ]}
    >
      <div className="flex flex-col gap-4 w-full">
        {props.grid ? (
          <AnimatePresence initial={false}>
            <div
              className={cn(
                "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
                props.className
              )}
            >
              {data?.map((item, index) => (
                <div className="" key={index}>
                  <GridCard onClick={props.onClick} item={item} />
                </div>
              ))}
            </div>
          </AnimatePresence>
        ) : (
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
        )}
        <Table.LoadMore />
        {/* <BatchActions /> */}
      </div>
    </Table.Provider>
  );
}
