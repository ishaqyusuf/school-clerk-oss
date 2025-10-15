"use client";

import { useStudentFilterParams } from "@/hooks/use-student-filter-params";
import { useTRPC } from "@/trpc/client";

import { useTableData, Table } from "@school-clerk/ui/data-table";
import { useStudentParams } from "@/hooks/use-student-params";
import { useStudentsStore } from "@/store/student";
import { StudentGridCard } from "./student-grid-card";
import { useAuth } from "@/hooks/use-auth";
import { AnimatePresence } from "framer-motion";
import { columns } from "./columns";
import { GetStudentsSchema } from "@api/trpc/schemas/schemas";
import { NoResults } from "@school-clerk/ui/custom/no-results";
import { EmptyState } from "@school-clerk/ui/custom/empty-state";
import { useTableScroll } from "@school-clerk/ui/hooks/use-table-scroll";
import { cn } from "@school-clerk/ui/cn";
// import { FindAndEnroll } from "@/components/find-and-enroll";
interface Props {
  defaultFilters?: GetStudentsSchema;
  grid?: boolean;
  onCreate?;
  className?: string;
}
export function DataTable({ grid = false, className, ...props }: Props) {
  const trpc = useTRPC();
  const { filter, hasFilters, setFilters } = useStudentFilterParams();
  const { data, ref, isFetching, hasNextPage } = useTableData({
    filter: {
      ...filter,
      ...(props.defaultFilters || {}),
    },
    route: trpc.students.index,
  });
  const auth = useAuth();
  const { update } = useStudentsStore();
  const { setParams, ...params } = useStudentParams();
  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 2,
  });
  if (hasFilters && !data?.length) {
    return <NoResults setFilter={setFilters} />;
  }

  if (!data?.length && !isFetching) {
    return (
      <EmptyState
        className="flex-col gap-4"
        onCreate={
          props.onCreate ||
          ((e) => {
            setParams({
              createStudent: true,
            });
          })
        }
      ></EmptyState>
    );
  }
  return (
    <Table.Provider
      args={[
        {
          columns: columns,
          data,
          props: {
            loadMoreRef: ref,
            hasNextPage,
          },
          tableScroll,
          tableMeta: {
            deleteAction(id) {
              // deleteStudent.execute({
              //   studentId: id,
              // });
            },
            rowClick(id, rowData) {
              setParams({
                studentViewId: id,
              });
            },
          },
        },
      ]}
    >
      <div className="flex flex-col gap-4">
        <AnimatePresence initial={false}>
          <div
            className={cn(
              "grid gap-4 md:grid-cols-2 lg:grid-cols-3",
              className
            )}
          >
            {data?.map((item, index) => (
              <div className="" key={index}>
                <StudentGridCard item={item} />
              </div>
            ))}
          </div>
        </AnimatePresence>
        <Table.LoadMore />
      </div>
    </Table.Provider>
  );
}
