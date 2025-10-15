"use client";

import {
  ClassRoomPageItem,
  updateClassroomDepartmentGrade,
} from "@/actions/get-class-rooms";
import { Menu } from "@/components/menu";
import { ColumnDef } from "@tanstack/react-table";

import { ActionCell } from "../action-cell";
import { Badge } from "@school-clerk/ui/badge";
import { useClassroomParams } from "@/hooks/use-classroom-params";

export type ClassItem = ClassRoomPageItem;
export const __classQueryState: {
  context: ReturnType<typeof useClassroomParams>;
} = {
  context: null as any,
};
export const columns: ColumnDef<ClassItem>[] = [
  {
    header: "Grade",
    accessorKey: "class_room",
    meta: {
      className: "sm:w-[100px]",
      // onClick() {},
    },
    cell: ({ row: { original: item } }) => <div>{item?.departmentLevel}</div>,
  },
  {
    header: "Classroom",
    accessorKey: "class_room",
    meta: {
      className: "sm:w-[350px]",
    },
    cell: ({ row: { original: item } }) => <div>{item?.displayName}</div>,
  },
  {
    header: "Students",
    accessorKey: "department",
    meta: {
      className: "w-[80px]",
      // onClick(item: ClassItem) {
      //   if (__classQueryState?.context) {
      //     __classQueryState?.context?.setParams({
      //       viewClassroomId: item?.id,
      //       classroomTab: "students",
      //     });
      //   }
      // },
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
    accessorKey: "actions",
    meta: {
      className: "flex-1",
    },
    cell: ({ row: { original: item } }) => (
      <ActionCell trash itemId={item.id}>
        <Menu>
          <Menu.Item
            SubMenu={
              <>
                {[...Array(10)].map((a, i) => (
                  <Menu.Item
                    onClick={(e) => {
                      updateClassroomDepartmentGrade(item.id, i + 1);
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
        </Menu>
      </ActionCell>
    ),
  },
];
