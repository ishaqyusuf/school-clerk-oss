"use client";

import type { createStaffSchema } from "@/actions/schema";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
import { Check, X } from "lucide-react";
import type { z } from "zod";

type Assignment = z.infer<typeof createStaffSchema>["assignments"][number];

export type AccessGridClass = {
  id: string;
  name: string;
  departments: Array<{
    id: string;
    name: string;
    offerings: Array<{ departmentSubjectId: string; subjectId: string }>;
  }>;
};

type SubjectColumn = { label: string; value: string };

// The grid's view of a teacher's assignments. Each set maps to one access
// scope: whole class (CLASS), subject across class (CLASS_SUBJECT), every
// subject in an arm (DEPARTMENT + ALL) and picked arm subjects
// (DEPARTMENT + SELECTED).
type Access = {
  wholeClasses: Set<string>;
  classSubjects: Map<string, Set<string>>;
  allArms: Set<string>;
  armSubjects: Map<string, Set<string>>;
};

function addTo(map: Map<string, Set<string>>, key: string, value: string) {
  const set = map.get(key) ?? new Set<string>();
  set.add(value);
  map.set(key, set);
}

function readAccess(assignments: Assignment[]): Access {
  const access: Access = {
    wholeClasses: new Set(),
    classSubjects: new Map(),
    allArms: new Set(),
    armSubjects: new Map(),
  };

  for (const assignment of assignments) {
    const { scope, classRoomId, classRoomDepartmentId, subjectId } = assignment;
    if (scope === "CLASS" && classRoomId) {
      access.wholeClasses.add(classRoomId);
    } else if (scope === "CLASS_SUBJECT" && classRoomId && subjectId) {
      addTo(access.classSubjects, classRoomId, subjectId);
    } else if (scope === "DEPARTMENT" && classRoomDepartmentId) {
      if (assignment.subjectAccessMode === "ALL") {
        access.allArms.add(classRoomDepartmentId);
      } else {
        for (const id of assignment.departmentSubjectIds) {
          addTo(access.armSubjects, classRoomDepartmentId, id);
        }
      }
    } else if (
      scope === "DEPARTMENT_SUBJECT" &&
      classRoomDepartmentId &&
      assignment.departmentSubjectId
    ) {
      addTo(
        access.armSubjects,
        classRoomDepartmentId,
        assignment.departmentSubjectId,
      );
    }
  }

  return access;
}

function writeAccess(access: Access): Assignment[] {
  const empty = {
    classRoomId: null,
    classRoomDepartmentId: null,
    subjectId: null,
    departmentSubjectId: null,
    departmentSubjectIds: [],
  };
  const assignments: Assignment[] = [];

  for (const classRoomId of access.wholeClasses) {
    assignments.push({
      ...empty,
      scope: "CLASS",
      classRoomId,
      subjectAccessMode: "ALL",
    });
  }
  for (const [classRoomId, subjectIds] of access.classSubjects) {
    for (const subjectId of subjectIds) {
      assignments.push({
        ...empty,
        scope: "CLASS_SUBJECT",
        classRoomId,
        subjectId,
        subjectAccessMode: "SELECTED",
      });
    }
  }
  for (const classRoomDepartmentId of access.allArms) {
    assignments.push({
      ...empty,
      scope: "DEPARTMENT",
      classRoomDepartmentId,
      subjectAccessMode: "ALL",
    });
  }
  for (const [classRoomDepartmentId, ids] of access.armSubjects) {
    if (!ids.size || access.allArms.has(classRoomDepartmentId)) continue;
    assignments.push({
      ...empty,
      scope: "DEPARTMENT",
      classRoomDepartmentId,
      subjectAccessMode: "SELECTED",
      departmentSubjectIds: [...ids],
    });
  }

  return assignments;
}

function cloneAccess(access: Access): Access {
  const cloneMap = (map: Map<string, Set<string>>) =>
    new Map([...map].map(([key, set]) => [key, new Set(set)]));
  return {
    wholeClasses: new Set(access.wholeClasses),
    classSubjects: cloneMap(access.classSubjects),
    allArms: new Set(access.allArms),
    armSubjects: cloneMap(access.armSubjects),
  };
}

function toggle(set: Set<string>, value: string) {
  if (set.has(value)) {
    set.delete(value);
    return false;
  }
  set.add(value);
  return true;
}

type CellState = "on" | "off" | "covered" | "unavailable";

function GridCell({
  state,
  label,
  wide,
  onToggle,
}: {
  state: CellState;
  label: string;
  wide?: boolean;
  onToggle: () => void;
}) {
  const content = wide ? "All" : <Check className="size-3.5" />;

  if (state === "unavailable") {
    return (
      <span
        className="text-xs text-muted-foreground/60"
        title="Not offered this term"
      >
        –
      </span>
    );
  }

  if (state === "covered") {
    return (
      <span
        className={cn(
          "inline-grid h-6 place-items-center rounded-md bg-primary/15 text-[11px] font-semibold text-primary",
          wide ? "w-10" : "w-7",
        )}
        title="Already covered by a wider tick"
      >
        {content}
      </span>
    );
  }

  const on = state === "on";
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "inline-grid h-6 place-items-center rounded-md border text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        wide ? "w-10" : "w-7",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-muted-foreground hover:border-primary",
        !wide && !on && "text-transparent",
      )}
    >
      {content}
    </button>
  );
}

type Props = {
  value: Assignment[];
  onChange: (next: Assignment[]) => void;
  grid: AccessGridClass[];
  subjects: SubjectColumn[];
  invalid?: boolean;
  isLoading?: boolean;
  viewerLabel?: string;
};

export function StaffAccessGrid({
  value,
  onChange,
  grid,
  subjects,
  invalid,
  isLoading,
  viewerLabel,
}: Props) {
  const access = readAccess(value);
  const subjectTitle = new Map(subjects.map((s) => [s.value, s.label]));
  const classes = grid.filter((c) => c.departments.length);

  function update(mutate: (next: Access) => void) {
    const next = cloneAccess(access);
    mutate(next);
    onChange(writeAccess(next));
  }

  function toggleWholeClass(classroom: AccessGridClass) {
    update((next) => {
      if (!toggle(next.wholeClasses, classroom.id)) return;
      // A whole-class tick replaces the narrower ticks under it.
      next.classSubjects.delete(classroom.id);
      for (const department of classroom.departments) {
        next.allArms.delete(department.id);
        next.armSubjects.delete(department.id);
      }
    });
  }

  function toggleClassSubject(classroom: AccessGridClass, subjectId: string) {
    update((next) => {
      const set = next.classSubjects.get(classroom.id) ?? new Set<string>();
      next.classSubjects.set(classroom.id, set);
      if (!toggle(set, subjectId)) {
        if (!set.size) next.classSubjects.delete(classroom.id);
        return;
      }
      for (const department of classroom.departments) {
        const picked = next.armSubjects.get(department.id);
        if (!picked) continue;
        for (const offering of department.offerings) {
          if (offering.subjectId === subjectId) {
            picked.delete(offering.departmentSubjectId);
          }
        }
      }
    });
  }

  function toggleArmAll(departmentId: string) {
    update((next) => {
      if (toggle(next.allArms, departmentId)) {
        next.armSubjects.delete(departmentId);
      }
    });
  }

  function toggleArmSubject(departmentId: string, departmentSubjectId: string) {
    update((next) => {
      const set = next.armSubjects.get(departmentId) ?? new Set<string>();
      next.armSubjects.set(departmentId, set);
      toggle(set, departmentSubjectId);
    });
  }

  const summary: Array<{ text: string; tag: string; key: string }> = [];
  for (const classroom of classes) {
    if (access.wholeClasses.has(classroom.id)) {
      summary.push({
        key: `c:${classroom.id}`,
        text: `${classroom.name} — whole class, all subjects`,
        tag: "Whole class",
      });
      continue;
    }
    const classSubjects = access.classSubjects.get(classroom.id);
    if (classSubjects?.size) {
      summary.push({
        key: `cs:${classroom.id}`,
        text: `${[...classSubjects].map((id) => subjectTitle.get(id) ?? "Subject").join(", ")} across all of ${classroom.name}`,
        tag: "Subject across class",
      });
    }
    for (const department of classroom.departments) {
      if (access.allArms.has(department.id)) {
        summary.push({
          key: `a:${department.id}`,
          text: `${department.name} — all subjects`,
          tag: "Arm",
        });
        continue;
      }
      const picked = access.armSubjects.get(department.id);
      const titles = department.offerings
        .filter(
          (offering) =>
            picked?.has(offering.departmentSubjectId) &&
            !classSubjects?.has(offering.subjectId),
        )
        .map((offering) => subjectTitle.get(offering.subjectId) ?? "Subject");
      if (titles.length) {
        summary.push({
          key: `a:${department.id}`,
          text: `${department.name} — ${titles.join(", ")}`,
          tag: "Arm",
        });
      }
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Loading classes…
      </div>
    );
  }

  if (!classes.length) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No classes are set up for this term yet.
      </div>
    );
  }

  const nameCell =
    "sticky left-0 z-10 min-w-24 whitespace-nowrap border-r bg-card px-3 text-left sm:min-w-32";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <p className="text-sm font-medium">Classroom access</p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Tick a class row to cover every arm
          </p>
          {value.length ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ml-auto h-7"
              onClick={() => onChange([])}
            >
              <X className="mr-1 size-3.5" />
              Clear
            </Button>
          ) : null}
        </div>

        {/* w-0 + min-w-full: sheets scroll inside a Radix ScrollArea whose
            display:table wrapper would otherwise grow to the table's width. */}
        <div
          className={cn(
            "w-0 min-w-full overflow-x-auto rounded-md border",
            invalid && "border-destructive",
          )}
        >
          <table className="w-full min-w-[560px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th
                  className={cn(
                    nameCell,
                    "h-11 border-b pb-2 align-bottom font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
                  )}
                >
                  Classroom
                </th>
                <th className="h-11 w-14 border-b border-r px-1 pb-2 align-bottom font-mono text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">
                  All
                  <br />
                  subjects
                </th>
                {subjects.map((subject) => (
                  <th
                    key={subject.value}
                    title={subject.label}
                    className="h-11 max-w-16 border-b px-1 pb-2 align-bottom font-mono text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground"
                  >
                    <span className="line-clamp-2 break-words">
                      {subject.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {classes.map((classroom) => {
                const whole = access.wholeClasses.has(classroom.id);
                const classSubjects = access.classSubjects.get(classroom.id);
                const showClassRow =
                  classroom.departments.length > 1 ||
                  whole ||
                  Boolean(classSubjects?.size);
                const offeredInClass = new Set(
                  classroom.departments.flatMap((department) =>
                    department.offerings.map((offering) => offering.subjectId),
                  ),
                );

                return [
                  showClassRow ? (
                    <tr key={`c:${classroom.id}`} className="group bg-muted/60">
                      <td
                        className={cn(
                          nameCell,
                          "h-9 border-b bg-muted font-semibold group-hover:bg-accent",
                        )}
                      >
                        {classroom.name}
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          Whole class · every arm
                        </span>
                      </td>
                      <td className="h-9 border-b border-r text-center group-hover:bg-accent/60">
                        <GridCell
                          wide
                          state={whole ? "on" : "off"}
                          label={`${classroom.name} whole class`}
                          onToggle={() => toggleWholeClass(classroom)}
                        />
                      </td>
                      {subjects.map((subject) => (
                        <td
                          key={subject.value}
                          className="h-9 border-b text-center group-hover:bg-accent/60"
                        >
                          <GridCell
                            state={
                              !offeredInClass.has(subject.value)
                                ? "unavailable"
                                : whole
                                  ? "covered"
                                  : classSubjects?.has(subject.value)
                                    ? "on"
                                    : "off"
                            }
                            label={`${subject.label} across ${classroom.name}`}
                            onToggle={() =>
                              toggleClassSubject(classroom, subject.value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ) : null,
                  ...classroom.departments.map((department) => {
                    const armAll = access.allArms.has(department.id);
                    const picked = access.armSubjects.get(department.id);
                    const offerings = new Map(
                      department.offerings.map((offering) => [
                        offering.subjectId,
                        offering.departmentSubjectId,
                      ]),
                    );

                    return (
                      <tr key={`a:${department.id}`} className="group">
                        <td
                          className={cn(
                            nameCell,
                            "h-9 border-b group-hover:bg-accent",
                            showClassRow ? "pl-7" : "font-semibold",
                          )}
                        >
                          {department.name}
                        </td>
                        <td className="h-9 border-b border-r text-center group-hover:bg-accent/60">
                          <GridCell
                            wide
                            state={whole ? "covered" : armAll ? "on" : "off"}
                            label={`${department.name} all subjects`}
                            onToggle={() => toggleArmAll(department.id)}
                          />
                        </td>
                        {subjects.map((subject) => {
                          const departmentSubjectId = offerings.get(
                            subject.value,
                          );
                          const state: CellState = !departmentSubjectId
                            ? "unavailable"
                            : whole ||
                                armAll ||
                                classSubjects?.has(subject.value)
                              ? "covered"
                              : picked?.has(departmentSubjectId)
                                ? "on"
                                : "off";

                          return (
                            <td
                              key={subject.value}
                              className="h-9 border-b text-center group-hover:bg-accent/60"
                            >
                              <GridCell
                                state={state}
                                label={`${subject.label} in ${department.name}`}
                                onToggle={() =>
                                  departmentSubjectId &&
                                  toggleArmSubject(
                                    department.id,
                                    departmentSubjectId,
                                  )
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">
          {viewerLabel ? `${viewerLabel} will see` : "They will see"}
        </p>
        <div className="flex flex-col rounded-md border">
          {summary.length ? (
            summary.map((line) => (
              <div
                key={line.key}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2 text-sm last:border-b-0"
              >
                <span className="min-w-0 flex-1">{line.text}</span>
                <Badge variant="outline" className="font-mono text-[10px] uppercase">
                  {line.tag}
                </Badge>
              </div>
            ))
          ) : (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">
              Nothing yet — tick a cell above.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
