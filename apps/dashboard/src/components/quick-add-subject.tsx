import { useMutation, useQuery } from "@tanstack/react-query";
import { _qc, _trpc } from "./static-trpc";
import { Check } from "lucide-react";
import { Button } from "@school-clerk/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { ScrollArea } from "@school-clerk/ui/scroll-area";
import { useEffect, useMemo, useState } from "react";

interface Props {
  departmentId: string;
}
export function QuickAddSubject(props: Props) {
  const { data: subjects } = useQuery(
    _trpc.subjects.getQuickAddSubjects.queryOptions(
      {
        departmentId: props.departmentId,
      },
      {
        enabled: !!props.departmentId,
      }
    )
  );
  const [open, setOpen] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const subjectIds = useMemo(
    () => subjects?.map((subject) => subject.id) ?? [],
    [subjects]
  );

  useEffect(() => {
    setSelectedSubjectIds((current) =>
      current.filter((subjectId) => subjectIds.includes(subjectId))
    );
  }, [subjectIds]);

  const { mutate: importSubjects, isPending: isImporting } = useMutation(
    _trpc.subjects.importSubjects.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {
        _qc.invalidateQueries({
          queryKey: _trpc.subjects.byClassroom.queryKey({
            departmentId: props.departmentId,
          }),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.subjects.getSubjects.infiniteQueryKey({
            departmentId: props.departmentId,
          }),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.subjects.getQuickAddSubjects.queryKey({
            departmentId: props.departmentId,
          }),
        });
        setSelectedSubjectIds([]);
        setOpen(false);
      },
      onError(error, variables, onMutateResult, context) {},
      meta: {
        toastTitle: {
          error: "Unable to complete",
          loading: "Importing subjects...",
          success: "Subjects imported.",
        },
      },
    })
  );
  const auth = useAuth();
  if (!subjects?.length) return null;
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="text-sm font-medium text-primary underline-offset-4 transition-colors hover:underline"
        >
          {open ? "Hide import" : "Import"}
        </button>
      </div>
      {open ? (
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex flex-col gap-1 pb-3">
            <p className="text-sm font-medium">Mark subjects to import</p>
            <p className="text-sm text-muted-foreground">
              Select one or more subjects not yet attached to this classroom.
            </p>
          </div>
          <ScrollArea className="max-h-64 pr-3">
            <div className="space-y-2">
              {subjects.map((subject) => {
                const checked = selectedSubjectIds.includes(subject.id);

                return (
                  <label
                    key={subject.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors",
                      checked
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:bg-background"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        setSelectedSubjectIds((current) =>
                          value
                            ? [...current, subject.id]
                            : current.filter((id) => id !== subject.id)
                        );
                      }}
                    />
                    <div className="min-w-0 flex-1 text-sm font-medium">
                      {subject.title}
                    </div>
                  </label>
                );
              })}
            </div>
          </ScrollArea>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <p className="text-sm text-muted-foreground">
              {selectedSubjectIds.length} subject
              {selectedSubjectIds.length === 1 ? "" : "s"} selected
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  setSelectedSubjectIds((current) =>
                    current.length === subjects.length ? [] : subjectIds
                  )
                }
              >
                {selectedSubjectIds.length === subjects.length
                  ? "Clear all"
                  : "Select all"}
              </Button>
              <Button
                type="button"
                disabled={!selectedSubjectIds.length || isImporting}
                onClick={() => {
                  importSubjects({
                    departmentId: props.departmentId,
                    subjectIds: selectedSubjectIds,
                    sessionTermId: auth.profile?.termId,
                  });
                }}
              >
                <Check className="size-4" />
                Batch import
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
