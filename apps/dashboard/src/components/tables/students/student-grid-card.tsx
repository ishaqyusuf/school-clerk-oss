import type { Item as DataItem } from "./columns";

import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";

import { MoreHorizontal, Eye } from "lucide-react";
import { useStudentParams } from "@/hooks/use-student-params";
import { Avatar, DropdownMenu } from "@school-clerk/ui/composite";
import { getInitials } from "@school-clerk/utils";
import { useMutation } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";
import { Spinner } from "@school-clerk/ui/spinner";

export function StudentGridCard({ item: student }: { item: DataItem }) {
  const { setParams, ...params } = useStudentParams();
  const { mutate: deleteStudent, isPending: isDeleting } = useMutation(
    _trpc.students.deleteStudent.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        _qc.invalidateQueries({
          queryKey: _trpc.students.index.infiniteQueryKey(),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.students.analytics.queryKey(),
        });
      },
      onError(error, variables, onMutateResult, context) {},
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Processing...",
          success: "Done!.",
        },
      },
    })
  );
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
    <div
      className="group bg-card rounded-xl border border-border p-5 flex flex-col items-center text-center relative hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
      onClick={() => setParams({ studentViewId: student.id })}
    >
      {/* Action Menu */}
      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {isDeleting ? (
                <Spinner />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item
              onClick={(e) => {
                e.stopPropagation();
                setParams({ studentViewId: student.id });
              }}
            >
              View Details
            </DropdownMenu.Item>
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
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onClick={(e) => {
                e.stopPropagation();
                deleteStudent({ studentId: student.id });
              }}
            >
              Delete Student
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>

      {/* Avatar */}
      <Avatar className="h-20 w-20 border-4 border-background shadow-sm mb-3">
        <Avatar.Image src="/placeholder.svg" alt={student.studentName} />
        <Avatar.Fallback className="text-lg">
          {getInitials(student.studentName)}
        </Avatar.Fallback>
      </Avatar>

      {/* Info */}
      <h3 className="font-bold text-lg text-foreground mb-0.5">
        {student.studentName}
      </h3>

      {/* Status Badges */}
      <div className="flex gap-2 mb-4 mt-2">
        <Badge
          variant="outline"
          className="text-[10px] font-bold uppercase tracking-wider border-green-200 text-green-700 dark:border-green-800 dark:text-green-400"
        >
          Active
        </Badge>
        <Badge
          variant="outline"
          className="text-[10px] font-bold uppercase tracking-wider border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
        >
          {student.gender}
        </Badge>
      </div>

      {/* Footer */}
      <div className="w-full pt-4 border-t border-border flex items-center justify-between">
        <div className="text-left">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Class
          </p>
          <p className="text-sm font-semibold text-foreground">
            {student.department}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setParams({ studentViewId: student.id });
            }}
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
