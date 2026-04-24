import { Badge } from "@school-clerk/ui/badge";
import { Item as ColumnItem } from "./columns";
import ConfirmBtn from "@/components/confirm-button";
import { useMutation } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { BookOpen, ChevronRight, View } from "lucide-react";

export function GridCard({ item, onClick }: { item: ColumnItem; onClick? }) {
  const { mutate: deleteClassSubject, isPending: isDeleting } = useMutation(
    _trpc.subjects.deleteClassSubject.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        _qc.invalidateQueries({
          queryKey: _trpc.subjects.getSubjects.infiniteQueryKey({
            departmentId: item.classRoomDepartment.id,
          }),
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
  const assessmentCount = item?._count?.assessments ?? 0;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(item)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.(item);
        }
      }}
      className={cn(
        "group rounded-2xl border border-border bg-background p-5 shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <BookOpen className="size-6" />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="space-y-1">
              <h3 className="truncate text-base font-semibold text-foreground">
                {item?.subject?.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                Classroom subject overview and assessment tracking.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1">
                {assessmentCount} assessment{assessmentCount === 1 ? "" : "s"}
              </Badge>
              <Badge variant="neutral" className="rounded-full px-3 py-1">
                Active this term
              </Badge>
            </div>
          </div>
        </div>
        <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
        <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Open subject workspace
        </div>
        <div
          className="flex items-center gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => onClick?.(item)}
          >
            <View className="size-4" />
          </Button>
          <ConfirmBtn
            trash
            onClick={(e) => {
              deleteClassSubject({
                id: item.id,
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
