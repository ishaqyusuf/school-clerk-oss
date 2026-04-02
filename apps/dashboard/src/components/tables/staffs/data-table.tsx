"use client";

import type { ListItem } from "@/actions/get-staff-list";
import { staffPageQuery } from "@/app/dashboard/[domain]/(sidebar)/staff/teachers/search-params";
import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useStaffParams } from "@/hooks/use-staff-params";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@school-clerk/ui/button";
import { Table } from "@school-clerk/ui/data-table";
import { EmptyState, NoResults } from "./empty-states";
import { columns } from "./columns";

type Props = {
  search?: string | null;
};

export function DataTable({ search }: Props) {
  const { setParams, ...params } = useStaffParams();
  const toast = useLoadingToast();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(
    trpc.staff.getStaffList.queryOptions(search ? { q: search } : undefined)
  );
  const { mutate: deleteStaff } = useMutation(
    trpc.staff.deleteStaff.mutationOptions({
      onSuccess() {
        toast.success("Deleted!", { variant: "destructive" });
        qc.invalidateQueries({ queryKey: trpc.staff.getStaffList.queryKey() });
      },
    })
  );

  if (!data?.length) {
    if (search) {
      return <NoResults />;
    }

    return <EmptyState />;
  }

  return (
    <Table.Provider
      args={[
        {
          columns: columns as any,
          data: data as ListItem[],
          setParams,
          params,
          tableMeta: {
            deleteAction(id) {
              deleteStaff({ staffId: id });
            },
            rowClick(id) {
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
          <MiddaySearchFilter
            placeholder="Search teachers"
            filterSchema={staffPageQuery}
          />
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() =>
              setParams({
                createStaff: true,
              })
            }
          >
            Create teacher
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
