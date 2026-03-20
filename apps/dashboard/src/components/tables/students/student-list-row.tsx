"use client";

import type { Item as DataItem } from "./columns";
import { Eye, Edit2 } from "lucide-react";
import { Avatar, DropdownMenu } from "@school-clerk/ui/composite";
import { getInitials } from "@school-clerk/utils";
import { Badge } from "@school-clerk/ui/badge";

interface Props {
  student: DataItem;
  onClick: () => void;
}

export function StudentListRow({ student, onClick }: Props) {
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
        </div>
      </td>
    </tr>
  );
}
