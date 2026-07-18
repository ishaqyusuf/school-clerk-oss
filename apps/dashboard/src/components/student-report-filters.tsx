import { useReportPageContext } from "@/hooks/use-report-page";
import { useStudentReportFilterParams } from "@/hooks/use-student-report-filter-params";
import { studentDisplayName } from "@/utils/utils";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { Button } from "@school-clerk/ui/button";
import { Field, Item, Select } from "@school-clerk/ui/composite";
import { Label } from "@school-clerk/ui/label";
import { Separator } from "@school-clerk/ui/separator";
import { Fragment } from "react";
import { ThemeSwitch } from "./theme-switch";
import { ExternalLinkIcon } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { _trpc } from "./static-trpc";
import { Menu } from "@school-clerk/ui/custom/menu";
import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";

export function StudentReportFilter({
  controlsOnly = false,
  allowedClassroomIds,
}: {
  controlsOnly?: boolean;
  allowedClassroomIds?: string[];
}) {
  const academicDataDirection = useAcademicDataDirection();
  const { setFilters, filters } = useStudentReportFilterParams();
  const ctx = useReportPageContext();
  const trpc = _trpc!;
  const { data: terms } = useQuery(trpc.academics.getReportTerms.queryOptions());
  const { mutate: deleteTermForm, isPending: isDeleting } = useMutation(
    trpc.students.deleteTermSheet.mutationOptions({
      onSuccess(data, variables, onMutateResult, context) {},
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

  const printOrder = filters.printOrder ?? [];

  function toggleStudent(termFormId: string) {
    const isSelected = printOrder.includes(termFormId);
    let newOrder: string[];
    if (isSelected) {
      newOrder = printOrder.filter((id) => id !== termFormId);
    } else {
      newOrder = [...printOrder, termFormId];
    }

    // Ensure current department is in activeDepts when selecting
    const activeDepts = filters.activeDepts ?? [];
    let newActiveDepts = activeDepts;
    if (!isSelected && filters.departmentId && !activeDepts.includes(filters.departmentId)) {
      newActiveDepts = [...activeDepts, filters.departmentId];
    }

    setFilters({ printOrder: newOrder, activeDepts: newActiveDepts });
  }

  function selectAll() {
    const currentIds = ctx?.termForms?.map((tf) => tf.id) ?? [];
    const others = printOrder.filter((id) => !currentIds.includes(id));
    const newOrder = [...others, ...currentIds];
    const activeDepts = filters.activeDepts ?? [];
    let newActiveDepts = activeDepts;
    if (filters.departmentId && !activeDepts.includes(filters.departmentId)) {
      newActiveDepts = [...activeDepts, filters.departmentId];
    }
    setFilters({ printOrder: newOrder, activeDepts: newActiveDepts });
  }

  function deselectAll() {
    const currentIds = ctx?.termForms?.map((tf) => tf.id) ?? [];
    setFilters({ printOrder: printOrder.filter((id) => !currentIds.includes(id)) });
  }

  const currentClassSelected = ctx?.termForms?.filter((tf) =>
    printOrder.includes(tf.id)
  ).length ?? 0;
  const allSelected =
    !!ctx?.termForms?.length && currentClassSelected === ctx.termForms.length;

  const isResultEntryAllowed =
    !!allowedClassroomIds &&
    !!filters.departmentId &&
    !!filters.termId &&
    allowedClassroomIds.includes(filters.departmentId);

  const controls = (
    <>
      <Field.Group
        className={
          controlsOnly
            ? "grid grid-cols-1 items-end gap-3 sm:grid-cols-2 md:grid-cols-[minmax(0,220px)_minmax(0,260px)_auto]"
            : undefined
        }
      >
        <Field className="min-w-0">
          <Field.Label>Term</Field.Label>
          <Select
            value={filters.termId}
            onValueChange={(e) => {
              const nextTermId = e || null;
              setFilters({
                termId: nextTermId,
                departmentId: null,
                printOrder: [],
                activeDepts: [],
              });
            }}
          >
            <Select.Trigger>
              <Select.Value placeholder="Select term" />
            </Select.Trigger>
            <Select.Content>
              {terms?.map((term) => (
                <Select.Item value={term.id} key={term.id}>
                  {term.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </Field>
        <Field className="min-w-0">
          <Field.Label>Classroom</Field.Label>
          <Select
            dir="ltr"
            value={filters.departmentId}
            onValueChange={(e) => {
              setFilters({ departmentId: e });
            }}
          >
            <Select.Trigger>
              <Select.Value placeholder="Select classroom" />
            </Select.Trigger>
            <Select.Content>
              {(allowedClassroomIds
                ? ctx?.classRooms?.filter((c) => allowedClassroomIds.includes(c?.id ?? ""))
                : ctx?.classRooms
              )?.map((c) => (
                <Select.Item value={c?.id} key={c?.id}>
                  <span dir="auto">
                    {c?.displayName ?? c?.departmentName}
                  </span>
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </Field>
        {isResultEntryAllowed && (
          <div
            className={
              controlsOnly
                ? "flex items-end sm:col-span-2 md:col-span-1"
                : undefined
            }
          >
            <Button asChild variant="outline" className="w-full gap-2 md:w-auto">
              <a
                href={`/assessment-recording?deptId=${filters.departmentId}&permission=all&termId=${filters.termId}`}
                target="_blank"
              >
                <ExternalLinkIcon className="size-4" />
                Assessment Recording
              </a>
            </Button>
          </div>
        )}
      </Field.Group>
    </>
  );

  if (controlsOnly) {
    return <div className="space-y-4">{controls}</div>;
  }

  return (
    <div className="gap-4 pb-28 flex flex-col">
      <div>
        <ThemeSwitch />
      </div>
      {controls}
      <Item.Separator />
      <div className="flex items-center justify-between">
        <Label>Students</Label>
        {!!ctx?.termForms?.length && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={allSelected ? deselectAll : selectAll}
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>
      <Item.Group dir={academicDataDirection}>
        {ctx?.termForms?.map((tf, tfi) => {
          const r = ctx?.reportsById?.[tf?.id];
          const isSelected = printOrder.includes(tf.id);
          return (
            <Fragment key={tf.id}>
              {tfi > 0 && <Separator />}
              <Item dir={academicDataDirection} variant="muted">
                <Item.Content>
                  <Item.Title>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleStudent(tf.id)}
                      id={`cb-${tf.id}`}
                    />
                    <span dir="auto">{studentDisplayName(tf?.student)}</span>
                  </Item.Title>
                  <Item.Description>
                    {`${r?.summary?.results}/${r?.summary?.subjects} | ${r?.grade?.percentage}% | ${r?.grade?.position}`}
                  </Item.Description>
                </Item.Content>
                <Item.Actions dir="ltr">
                  <Menu triggerSize="xs" variant="secondary">
                    <Menu.Item
                      onClick={(e) => {
                        deleteTermForm({
                          id: tf?.id,
                        });
                      }}
                      icon="Delete"
                    >
                      Delete
                    </Menu.Item>
                  </Menu>
                </Item.Actions>
              </Item>
            </Fragment>
          );
        })}
      </Item.Group>
    </div>
  );
}
