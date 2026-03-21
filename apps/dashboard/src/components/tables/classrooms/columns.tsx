import { useIsMobile } from "@school-clerk/ui/hooks/use-mobile";
import { Menu } from "@school-clerk/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@school-clerk/ui/cn";

import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { _qc, _trpc } from "@/components/static-trpc";

export type Item = RouterOutputs["academics"]["getClassrooms"]["data"][number];
interface ItemProps {
  item: Item;
}
type Column = ColumnDef<Item>;

export const columns: Column[] = [
  {
    header: "Class Name",
    accessorKey: "class_room",
    meta: {
      className: "w-[25%]",
    },
    cell: ({ row: { original: item } }) => (
      <div className="flex flex-col">
        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {item?.displayName}
        </span>
        <span className="text-xs text-muted-foreground">
          {item?.classRoom?.name}
        </span>
      </div>
    ),
  },
  {
    header: "Students",
    accessorKey: "department",
    meta: {
      className: "w-[25%]",
    },
    cell: ({ row: { original: item } }) => {
      const count = item?._count?.studentSessionForms ?? 0;
      const capacity = 40;
      const percentage = capacity > 0 ? (count / capacity) * 100 : 0;
      return (
        <div className="flex flex-col gap-1.5 max-w-[160px]">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium text-foreground">{count}</span>
            <span className="text-xs text-muted-foreground">
              of {capacity} seats
            </span>
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                count === 0
                  ? "bg-transparent"
                  : percentage > 90
                    ? "bg-orange-500"
                    : "bg-primary",
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      );
    },
  },
  {
    header: "Active Term",
    accessorKey: "term",
    meta: {
      className: "w-[20%]",
    },
    cell: ({ row: { original: item } }) => {
      const termTitle = item?.classRoom?.session?.title;
      return (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
            termTitle
              ? "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30"
              : "bg-secondary text-muted-foreground border-border",
          )}
        >
          {termTitle || "Setup Pending"}
        </span>
      );
    },
  },
  {
    header: "",
    accessorKey: "action",
    meta: {
      actionCell: true,
      preventDefault: true,
      className: "w-[80px]",
    },
    cell: ({ row: { original: item } }) => (
      <>
        <Actions item={item} />
      </>
    ),
  },
];

function Actions({ item }: ItemProps) {
  const isMobile = useIsMobile();
  const auth = useAuth();
  const { mutate: deleteClassroomDepartmentGrade } = useMutation(
    useTRPC().classrooms.deleteClassroomTermDepartment.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {},
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    }),
  );
  return (
    <div className="relative flex justify-end z-10">
      <Menu
        triggerSize={isMobile ? "default" : "xs"}
        Trigger={
          <Button className={cn(isMobile || "size-4 p-0")} variant="ghost">
            <Icons.MoreHoriz className="" />
          </Button>
        }
      >
        <Menu.Item
          SubMenu={
            <>
              {[...Array(10)].map((a, i) => (
                <Menu.Item
                  onClick={(e) => {
                    //  updateClassroomDepartmentGrade(item.id, i + 1);
                  }}
                  key={i}
                >
                  Grade {i + 1}
                </Menu.Item>
              ))}
            </>
          }
        >
          Update Class Grade
        </Menu.Item>

        <Link
          target="_blank"
          href={`/student-report?departmentId=${item.id}&termId=${auth?.profile?.termId}`}
        >
          <Menu.Item>Report Sheet</Menu.Item>
        </Link>
        <Menu.Item
          icon="trash"
          onClick={(e) => {
            deleteClassroomDepartmentGrade({ departmentId: item.id });
            _qc.invalidateQueries({
              queryKey: _trpc.classrooms.all.queryKey(),
            });
            // _qc.invalidateQueries({
            //   queryKey: _trpc.classrooms.all.
            // });
          }}
        >
          Delete Classroom
        </Menu.Item>
      </Menu>
    </div>
  );
}
export const mobileColumn: ColumnDef<Item>[] = [
  {
    header: "",
    accessorKey: "row",
    meta: {
      className: "flex-1 p-0",
    },
    cell: ({ row: { original: item } }) => {
      return <ItemCard item={item} />;
    },
  },
];
function ItemCard({ item }: ItemProps) {
  const count = item?._count?.studentSessionForms ?? 0;
  const termTitle = item?.classRoom?.session?.title;
  return (
    <div className="p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            {item?.displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            {item?.classRoom?.name}
          </span>
        </div>
        <Actions item={item} />
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{count}</span> students
        </span>
        {termTitle && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/30">
            {termTitle}
          </span>
        )}
      </div>
    </div>
  );
}
