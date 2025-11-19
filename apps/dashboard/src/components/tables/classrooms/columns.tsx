import { useIsMobile } from "@school-clerk/ui/hooks/use-mobile";
import { Menu } from "@school-clerk/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@school-clerk/ui/cn";

import { Badge } from "@school-clerk/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";

export type Item = RouterOutputs["academics"]["getClassrooms"]["data"][number];
interface ItemProps {
  item: Item;
}
type Column = ColumnDef<Item>;
const column1: Column = {
  header: "grade",
  accessorKey: "",
  meta: {
    className: "w-[50px]",
  },
  cell: ({ row: { original: item } }) => <div>{item?.departmentLevel}</div>,
};

export const columns: Column[] = [
  column1,
  {
    header: "Classroom",
    accessorKey: "class_room",
    meta: {
      className: "sm:flex-1",
    },
    cell: ({ row: { original: item } }) => <div>{item?.displayName}</div>,
  },
  {
    header: "Students",
    accessorKey: "department",
    meta: {
      className: "w-[80px]",
    },
    cell: ({ row: { original: item } }) => {
      return (
        <span className="flex text-center">
          <Badge>{item?._count?.studentSessionForms}</Badge>
        </span>
      );
    },
  },
  {
    header: "Subjects",
    accessorKey: "subjects",
    meta: {
      className: "w-[80px]",
    },
    cell: ({ row: { original: item } }) => <div className="">{0}</div>,
  },
  {
    header: "",
    accessorKey: "action",
    meta: {
      actionCell: true,
      preventDefault: true,
      className: "w-[100px]",
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
      // preventDefault: true,
    },
    cell: ({ row: { original: item } }) => {
      return <ItemCard item={item} />;
    },
  },
];
function ItemCard({ item }: ItemProps) {
  // design a mobile version of the columns here

  return <></>;
}
