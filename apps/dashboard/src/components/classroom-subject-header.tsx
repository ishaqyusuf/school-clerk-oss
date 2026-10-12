import { Button } from "@school-clerk/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@school-clerk/ui/dropdown-menu";
import { SubjectForm, SubjectFormAction } from "./forms/subject-form";
import { _qc, _trpc } from "./static-trpc";
import { useMemo, useState } from "react";
import { QuickAddSubject, useQuickAddSubjects } from "./quick-add-subject";
import { useAuth } from "@/hooks/use-auth";
import { ClassroomSectionHeader } from "./classroom-overview/classroom-section-nav";
import { Import, MoreHorizontal, Plus } from "lucide-react";

export type SubjectHeaderPanel = "add" | "import" | null;

export function ClassroomSubjectHeader({
  departmentId,
  panel,
  onPanelChange: setPanel,
}: {
  departmentId: string;
  panel: SubjectHeaderPanel;
  onPanelChange: (panel: SubjectHeaderPanel) => void;
}) {
  // Remounts the add form after each save so it starts empty.
  const [formKey, setFormKey] = useState(0);
  const auth = useAuth();
  const { data: catalogSubjects } = useQuickAddSubjects(departmentId);
  const defaultValues = useMemo(
    () => ({
      departmentId,
      sessionTermId: auth.profile?.termId,
    }),
    [departmentId, auth.profile?.termId],
  );
  return (
    <div className="flex flex-col gap-4">
      <ClassroomSectionHeader
        title="Subjects"
        actions={
          <>
            <Button
              size="sm"
              className="gap-2"
              variant={panel === "add" ? "secondary" : "default"}
              aria-expanded={panel === "add"}
              onClick={() => setPanel(panel === "add" ? null : "add")}
            >
              <Plus className="size-4" />
              Add subject
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" className="size-9" aria-label="More subject actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={!catalogSubjects?.length}
                  onSelect={() => setPanel("import")}
                >
                  <Import className="mr-2 size-4" />
                  {catalogSubjects?.length
                    ? "Import from catalog"
                    : "All catalog subjects added"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />
      {panel === "add" ? (
        <div className="rounded-lg border border-border bg-card p-4">
          <SubjectForm key={formKey} defaultValues={defaultValues as never}>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPanel(null)}>
                Cancel
              </Button>
              <SubjectFormAction
                onSuccess={() => {
                  _qc.invalidateQueries({
                    queryKey: _trpc.subjects.getSubjects.infiniteQueryKey({}),
                  });
                  _qc.invalidateQueries({
                    queryKey: _trpc.subjects.byClassroom.queryKey({
                      departmentId,
                    } as never),
                  });
                  setFormKey((key) => key + 1);
                }}
                onError={() => {
                  // The mutation's toast meta already reports the failure; keep the draft.
                }}
              />
            </div>
          </SubjectForm>
        </div>
      ) : null}
      <QuickAddSubject
        departmentId={departmentId}
        open={panel === "import"}
        onOpenChange={(open) => setPanel(open ? "import" : null)}
      />
    </div>
  );
}
