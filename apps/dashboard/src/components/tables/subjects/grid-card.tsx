import { Item as ColumnItem } from "./columns";
import ConfirmBtn from "@/components/confirm-button";
import { useMutation } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";
import { cn } from "@school-clerk/ui/cn";
import { BookOpen, ChevronRight } from "lucide-react";
import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";
import { useAuth } from "@/hooks/use-auth";

/** One subject row in the classroom subjects list. */
export function GridCard({ item, onClick }: { item: ColumnItem; onClick? }) {
  const academicDataDirection = useAcademicDataDirection();
  const auth = useAuth();
  const canDelete = auth.role === "Admin" || auth.role === "ADMIN";
  const { mutate: deleteClassSubject } = useMutation(
    _trpc.subjects.deleteClassSubject.mutationOptions({
      onSuccess() {
        _qc.invalidateQueries({
          queryKey: _trpc.subjects.getSubjects.infiniteQueryKey({
            departmentId: item.classRoomDepartment.id,
          }),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.subjects.byClassroom.queryKey({
            departmentId: item.classRoomDepartment.id,
          } as never),
        });
      },
      meta: {
        toastTitle: {
          error: "Unable to delete subject",
          loading: "Deleting subject...",
          success: "Subject deleted",
        },
      },
    })
  );
  const assessmentCount = item?._count?.assessments ?? 0;
  return (
    <div
      dir={academicDataDirection}
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.(item);
        }
      }}
      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <BookOpen className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-left text-sm font-medium text-foreground [[dir=rtl]_&]:text-right"
          dir="auto"
        >
          {item?.subject?.title}
        </p>
        <p
          className={cn(
            "text-left text-xs [[dir=rtl]_&]:text-right",
            assessmentCount
              ? "text-muted-foreground"
              : "text-amber-700 dark:text-amber-400"
          )}
          dir="ltr"
        >
          {assessmentCount
            ? `${assessmentCount} assessment${assessmentCount === 1 ? "" : "s"}`
            : "No assessments yet"}
        </p>
      </div>
      {canDelete ? (
        <div onClick={(event) => event.stopPropagation()} dir="ltr">
          <ConfirmBtn
            trash
            onClick={() => {
              deleteClassSubject({
                id: item.id,
              });
            }}
          />
        </div>
      ) : null}
      <ChevronRight
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5",
          academicDataDirection === "rtl" && "rotate-180"
        )}
      />
    </div>
  );
}
