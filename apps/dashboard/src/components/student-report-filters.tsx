"use client";

import { MobileFilterButton, FilterChoices, type FilterValues, type MobileFilterGroup } from "@school-clerk/ui/search-filter/mobile-filter-sheet";
import { useAcademicDataDirection } from "@/components/academic-data-direction/provider";
import { useStudentNameFormatter } from "@/components/student-name-format/provider";
import { useReportPageContext } from "@/hooks/use-report-page";
import { useStudentReportFilterParams } from "@/hooks/use-student-report-filter-params";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { Field, Item, Select } from "@school-clerk/ui/composite";
import { Menu } from "@school-clerk/ui/custom/menu";
import { Label } from "@school-clerk/ui/label";
import { Separator } from "@school-clerk/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { ExternalLinkIcon, MoreHorizontal } from "lucide-react";
import { Fragment } from "react";
import { useTRPC } from "@/trpc/client";
import { useRemoveStudentTerms } from "@/hooks/use-remove-student-terms";
import { ThemeSwitch } from "./theme-switch";

export function StudentReportFilter({
  controlsOnly = false,
  allowedClassroomIds,
}: {
  controlsOnly?: boolean;
  allowedClassroomIds?: string[];
}) {
  const academicDataDirection = useAcademicDataDirection();
	const formatStudentName = useStudentNameFormatter();
  const { setFilters, filters } = useStudentReportFilterParams();
  const ctx = useReportPageContext();
  const trpc = useTRPC();
	const { data: terms } = useQuery(
		trpc.academics.getReportTerms.queryOptions(),
	);
  const removal = useRemoveStudentTerms({
    contextKey: JSON.stringify([filters.termId, filters.departmentId, filters.printOrder, filters.activeDepts]),
    onSuccess(_result, selection) {
      setFilters({ printOrder: (filters.printOrder ?? []).filter((id) => !selection.ids.includes(id)) });
    },
  });
  const { mutate: deleteTermForm, isPending: isDeleting } = removal;

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
		if (
			!isSelected &&
			filters.departmentId &&
			!activeDepts.includes(filters.departmentId)
		) {
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
		setFilters({
			printOrder: printOrder.filter((id) => !currentIds.includes(id)),
		});
  }

	const currentClassSelected =
		ctx?.termForms?.filter((tf) => printOrder.includes(tf.id)).length ?? 0;
  const allSelected =
    !!ctx?.termForms?.length && currentClassSelected === ctx.termForms.length;

  const isResultEntryAllowed =
    !!allowedClassroomIds &&
    !!filters.departmentId &&
    !!filters.termId &&
    allowedClassroomIds.includes(filters.departmentId);

  const controls = (
    <>
      {removal.error ? <p role="alert" className="break-words text-sm text-destructive">{removal.error.message}</p> : null}
      <MobileFilterButton
        values={filters}
        groups={[
          {
            key: "termId",
            label: "Term",
            options: (terms ?? []).map((term) => ({
              value: term.id,
              label: term.label,
            })),
          },
          {
            key: "departmentId",
            label: "Classroom",
            options: (allowedClassroomIds
              ? ctx?.classRooms?.filter((room) =>
                  allowedClassroomIds.includes(room.id),
                )
              : ctx?.classRooms
            )?.map((room) => ({
              value: room.id,
              label: room.displayName ?? room.departmentName ?? "Classroom",
            })),
          },
        ]}
        onSelectOption={(draft, group, option) =>
          group.key === "termId"
            ? { termId: option.value || null, departmentId: null }
            : null
        }
        renderGroup={(group, value, update, draft) =>
          group.key === "departmentId" ? (
            <DraftReportClassrooms
              group={group}
              value={value}
              termId={draft.termId as string | null}
              allowedIds={allowedClassroomIds}
              onChange={update}
            />
          ) : undefined
        }
        onApply={(draft) =>
          setFilters({
            ...draft,
            ...(draft.termId !== filters.termId
              ? { printOrder: [], activeDepts: [] }
              : {}),
          })
        }
      />
      <Field.Group
        className={
          controlsOnly
            ? "grid grid-cols-1 items-end gap-3 sm:grid-cols-2 md:grid-cols-[minmax(0,220px)_minmax(0,260px)_auto]"
            : undefined
        }
      >
        <Field className="hidden min-w-0 md:block">
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
        <Field className="hidden min-w-0 md:block">
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
								? ctx?.classRooms?.filter((c) =>
										allowedClassroomIds.includes(c?.id ?? ""),
									)
                : ctx?.classRooms
              )?.map((c) => (
                <Select.Item value={c?.id} key={c?.id}>
									<span dir="auto">{c?.displayName ?? c?.departmentName}</span>
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
						<Button
							asChild
							variant="outline"
							className="w-full gap-2 md:w-auto"
						>
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
										<span dir="auto">{formatStudentName(tf?.student)}</span>
                  </Item.Title>
                  <Item.Description>
                    {`${r?.summary?.results}/${r?.summary?.subjects} | ${r?.grade?.percentage}% | ${r?.grade?.position}`}
                  </Item.Description>
                </Item.Content>
                <Item.Actions dir="ltr">
                  <Menu Trigger={<Button variant="secondary" size="icon" className="size-11" aria-label="Student report actions"><MoreHorizontal className="size-4" /></Button>}>
                    <Menu.Item
                      className="min-h-11"
                      disabled={!removal.ready || isDeleting}
                      onClick={(e) => {
                        if (!removal.ready || !tf?.id || isDeleting || !window.confirm("Remove this student from the selected term? Financial and assessment history is retained, and outstanding balances are not cancelled.")) return;
                        deleteTermForm({
                          id: tf?.id,
                        });
                      }}
                      icon="Delete"
                    >
                      Remove from term
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

function DraftReportClassrooms({ group, value, termId, allowedIds, onChange }: { group: MobileFilterGroup; value: unknown; termId: string | null; allowedIds?: string[]; onChange: (patch: FilterValues) => void }) {
  const trpc = useTRPC();
  const { data, isLoading, isError, refetch } = useQuery(trpc.classrooms.all.queryOptions({ sessionTermId: termId }, { enabled: Boolean(termId) }));
  const rooms = allowedIds ? data?.data?.filter((room) => allowedIds.includes(room.id)) : data?.data;
  if (!termId) return <p className="text-sm text-muted-foreground">Choose a term to see classrooms.</p>;
  if (isError) return <div role="alert"><p>Could not load classrooms.</p><Button type="button" variant="outline" onClick={() => { void refetch(); }}>Retry</Button></div>;
  return <FilterChoices group={{ ...group, loading: isLoading, options: rooms?.map((room) => ({ value: room.id, label: room.displayName ?? room.departmentName ?? "Classroom" })) }} value={value} onSelect={(option) => onChange({ departmentId: option.value || null })} />;
}
