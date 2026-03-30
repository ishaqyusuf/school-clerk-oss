"use client";

import type { Item as DataItem } from "./columns";
import { Eye, MoreHorizontal, AlertTriangle } from "lucide-react";
import { Avatar, DropdownMenu } from "@school-clerk/ui/composite";
import { getInitials } from "@school-clerk/utils";
import { Badge } from "@school-clerk/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";

interface Props {
  student: DataItem;
  onClick: () => void;
}

export function StudentListRow({ student, onClick }: Props) {
  const { mutate: changeGender } = useMutation(
    _trpc.students.changeGender.mutationOptions({
      onSuccess() {
        _qc.invalidateQueries({
          queryKey: _trpc.students.index.infiniteQueryKey(),
        });
      },
      meta: {
        toastTitle: {
          error: "Unable to update gender",
          loading: "Updating...",
          success: "Gender updated.",
        },
      },
    })
  );

  return (
    <tr
      className="hover:bg-muted/50 transition-colors group cursor-pointer"
      onClick={onClick}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <Avatar.Image
              src="/placeholder.svg"
              alt={student.studentName}
            />
            <Avatar.Fallback>
              {getInitials(student.studentName)}
            </Avatar.Fallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">
              {student.studentName}
            </p>
            {student.hasPreviousBalance && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600 mt-0.5">
                <AlertTriangle className="h-3 w-3" />
                Outstanding balance
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-muted-foreground">
        {student.department}
      </td>
      <td className="px-6 py-4">
        <Badge
          variant="outline"
          className="text-xs border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
        >
          {student.gender}
        </Badge>
      </td>
      <td className="px-6 py-4">
        <Badge
          variant="outline"
          className="text-xs border-green-200 text-green-700 dark:border-green-800 dark:text-green-400"
        >
          Active
        </Badge>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <Eye className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <button
                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item
                disabled={student.gender === "Male"}
                onClick={(e) => {
                  e.stopPropagation();
                  changeGender({ id: student.id, gender: "Male" });
                }}
              >
                Set as Male
              </DropdownMenu.Item>
              <DropdownMenu.Item
                disabled={student.gender === "Female"}
                onClick={(e) => {
                  e.stopPropagation();
                  changeGender({ id: student.id, gender: "Female" });
                }}
              >
                Set as Female
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
