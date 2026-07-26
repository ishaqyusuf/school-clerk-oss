"use client";

import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";
import { useSubjectFilterParams } from "@/hooks/use-subject-filter-params";
import { useTRPC } from "@/trpc/client";
import { EmptyState } from "@school-clerk/ui/custom/empty-state";
import { NoResults } from "@school-clerk/ui/custom/no-results";
import { Table, useTableData } from "@school-clerk/ui/data-table";
import { useTableScroll } from "@school-clerk/ui/hooks/use-table-scroll";
import { catalogColumns, catalogMobileColumn } from "./catalog-columns";

export function SubjectCatalogDataTable() {
  const academicDataDirection = useAcademicDataDirection();
  const trpc = useTRPC();
  const { filters, hasFilters, setFilters } = useSubjectFilterParams();
  const { data, ref, hasNextPage, isFetching } = useTableData({
    filter: filters,
    route: trpc.subjects.getSubjectCatalog,
  });
  const tableScroll = useTableScroll({
    useColumnWidths: true,
    startFromColumn: 1,
  });

  if (hasFilters && !data?.length) {
    return <NoResults setFilter={setFilters} />;
  }

  if (!data?.length && !isFetching) {
    return <EmptyState onCreate={() => undefined} />;
  }

  return (
    <Table.Provider
      args={[
        {
          columns: catalogColumns,
          mobileColumn: catalogMobileColumn,
          data,
          props: {
            hasNextPage,
            loadMoreRef: ref,
          },
          tableScroll,
        },
      ]}
    >
      <div className="flex w-full flex-col gap-4" dir={academicDataDirection}>
        <div className="overflow-x-auto overscroll-x-none border-x border-border scrollbar-hide">
          <Table>
            <Table.Header />
            <Table.Body>
              <Table.Row />
            </Table.Body>
          </Table>
        </div>
        <Table.LoadMore />
      </div>
    </Table.Provider>
  );
}
