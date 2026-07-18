"use client";
import { switchSessionTerm } from "@/actions/cookies/auth-cookie";
import { AssessmentRecordingResultsTable } from "@/components/assessment-recording-results-table";
import { _trpc } from "@/components/static-trpc";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useAuth } from "@/hooks/use-auth";
import { useAssessmentRecordingParams } from "@/hooks/use-assessment-recording-params";
import { Button } from "@school-clerk/ui/button";
import { Dialog, Field, Select } from "@school-clerk/ui/composite";
import { useQuery } from "@tanstack/react-query";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { BookOpenText, PanelRightOpen, School, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type RecordingContextOptions =
  RouterOutputs["assessments"]["getRecordingContextOptions"];
type RecordingTermOption = RecordingContextOptions["terms"][number];

type RecordingClassroomOption =
  RecordingContextOptions["classrooms"][number] & {
    classRoom?: {
      name?: string | null;
    } | null;
    departmentName?: string | null;
    displayName?: string | null;
    _count?: {
      studentSessionForms?: number | null;
    } | null;
    subjects?: unknown[] | null;
  };

function isClassroomManagerRole(role?: string | null) {
  return role === "Admin" || role === "ADMIN";
}

export function AssessmentRecording() {
  const { filters, permissions, setFilters } = useAssessmentRecordingParams();
  const { setParams: setClassroomParams } = useClassroomParams();
  const auth = useAuth();
  const [pendingCurrentTermId, setPendingCurrentTermId] = useState("");
  const [isSavingCurrentTerm, setIsSavingCurrentTerm] = useState(false);
  const syncedTermRef = useRef<string | null>(null);
  const { data: contextOptions, isLoading: isLoadingContext } = useQuery(
    _trpc.assessments.getRecordingContextOptions.queryOptions({
      termId: filters.termId ?? null,
    }),
  );
  const terms = (contextOptions?.terms ?? []) as RecordingTermOption[];
  const departments = (contextOptions?.classrooms ??
    []) as RecordingClassroomOption[];
  const effectiveTermId =
    (contextOptions?.scoped &&
    filters.termId &&
    terms.some((term) => term.id === filters.termId)
      ? filters.termId
      : null) ??
    (contextOptions?.scoped
      ? contextOptions.defaultTermId
      : (filters.termId ?? contextOptions?.defaultTermId)) ??
    "";
  const effectiveDepartmentId =
    (filters.deptId &&
    departments.some((department) => department.id === filters.deptId)
      ? filters.deptId
      : null) ??
    contextOptions?.defaultDepartmentId ??
    "";
  const selectedDepartment = departments.find(
    (dept) => dept.id === effectiveDepartmentId,
  );
  const canLoadTable = contextOptions?.scoped
    ? !!effectiveTermId && !!effectiveDepartmentId && !!selectedDepartment
    : !!effectiveTermId && !!effectiveDepartmentId;
  const needsSetup = !canLoadTable;
  const canManageClassroom = isClassroomManagerRole(auth.role);
  const canOpenReportSheet = canManageClassroom;
  const shouldPickCurrentTerm =
    !isLoadingContext &&
    !!contextOptions &&
    !effectiveTermId &&
    terms.length > 0;
  const termById = useMemo(
    () => new Map(terms.map((term) => [term.id, term])),
    [terms],
  );
  const emptyStateMessage = !terms.length
    ? contextOptions?.scoped
      ? "No assessment terms are assigned to your teacher profile yet."
      : "No assessment terms are available yet."
    : shouldPickCurrentTerm
      ? "Pick the current term to continue."
      : effectiveTermId && !departments.length
        ? contextOptions?.scoped
          ? "No classrooms are assigned to your teacher profile for this term."
          : "No classrooms are available for this term."
        : "No classroom is available for assessment recording.";

  useEffect(() => {
    if (!contextOptions || !effectiveTermId) return;

    const hasValidTerm =
      !!filters.termId && terms.some((term) => term.id === filters.termId);
    const hasValidDepartment =
      !!filters.deptId &&
      departments.some((department) => department.id === filters.deptId);
    const nextTermId = hasValidTerm ? filters.termId : effectiveTermId;
    const nextDepartmentId = hasValidDepartment
      ? filters.deptId
      : contextOptions.defaultDepartmentId;
    const patch: {
      termId?: string | null;
      deptId?: string | null;
      deptSubjectId?: string | null;
    } = {};

    if ((filters.termId ?? null) !== nextTermId) {
      patch.termId = nextTermId;
      patch.deptSubjectId = null;
    }

    if ((filters.deptId ?? null) !== nextDepartmentId) {
      patch.deptId = nextDepartmentId;
      patch.deptSubjectId = null;
    }

    if (Object.keys(patch).length) {
      setFilters(patch);
    }

    const selectedTerm = termById.get(effectiveTermId);
    if (
      selectedTerm &&
      !auth.profile?.termId &&
      syncedTermRef.current !== selectedTerm.id
    ) {
      syncedTermRef.current = selectedTerm.id;
      switchSessionTerm({
        termId: selectedTerm.id,
        termTitle: selectedTerm.title,
        sessionId: selectedTerm.sessionId,
        sessionTitle: selectedTerm.sessionTitle,
      }).catch(() => {
        syncedTermRef.current = null;
      });
    }
  }, [
    auth.profile?.termId,
    contextOptions,
    departments,
    effectiveTermId,
    filters.deptId,
    filters.termId,
    setFilters,
    termById,
    terms,
  ]);

  useEffect(() => {
    if (!shouldPickCurrentTerm || pendingCurrentTermId) return;
    setPendingCurrentTermId(terms[0]?.id ?? "");
  }, [pendingCurrentTermId, shouldPickCurrentTerm, terms]);

  const saveCurrentTerm = async () => {
    const selectedTerm = termById.get(pendingCurrentTermId);
    if (!selectedTerm) return;

    setIsSavingCurrentTerm(true);
    try {
      await switchSessionTerm({
        termId: selectedTerm.id,
        termTitle: selectedTerm.title,
        sessionId: selectedTerm.sessionId,
        sessionTitle: selectedTerm.sessionTitle,
      });
      await setFilters({
        termId: selectedTerm.id,
        deptId: null,
        deptSubjectId: null,
      });
    } finally {
      setIsSavingCurrentTerm(false);
    }
  };

  const selectedTerm = effectiveTermId ? termById.get(effectiveTermId) : null;
  const openSelectedClassroomOverview = () => {
    if (!canManageClassroom || !effectiveDepartmentId) return;

    setClassroomParams({
      viewClassroomId: effectiveDepartmentId,
      classroomTab: "subjects",
    });
  };

  return (
    <>
      <div className="flex flex-col gap-4 px-2 py-3 sm:mx-auto sm:max-w-4xl sm:px-0 sm:py-4">
        <div>
          {!needsSetup ? (
            <AssessmentRecordingResultsTable
              departmentId={effectiveDepartmentId}
              termId={effectiveTermId}
              selectedSubjectId={filters.deptSubjectId}
              classrooms={permissions.classrooms ? departments : []}
              onClassroomChange={(deptId) => {
                setFilters({
                  deptId,
                  deptSubjectId: null,
                  termId: effectiveTermId || null,
                });
              }}
              onOpenClassroomOverview={
                canManageClassroom ? openSelectedClassroomOverview : undefined
              }
              reportSheetHref={
                canOpenReportSheet &&
                permissions.all &&
                effectiveDepartmentId &&
                effectiveTermId
                  ? `/student-report?deptId=${effectiveDepartmentId}&permission=all&termId=${effectiveTermId}`
                  : null
              }
            />
          ) : (
            <AssessmentRecordingSetupState
              canManageClassroom={canManageClassroom}
              departments={departments}
              effectiveDepartmentId={effectiveDepartmentId}
              effectiveTermId={effectiveTermId}
              isLoading={isLoadingContext}
              message={emptyStateMessage}
              onClassroomChange={(deptId) => {
                setFilters({
                  deptId,
                  deptSubjectId: null,
                  termId: effectiveTermId || null,
                });
              }}
              onOpenClassroomOverview={openSelectedClassroomOverview}
              onTermChange={(termId) => {
                setFilters({
                  deptId: null,
                  deptSubjectId: null,
                  termId: termId || null,
                });
              }}
              selectedDepartment={selectedDepartment}
              selectedTerm={selectedTerm}
              terms={terms}
            />
          )}
        </div>
      </div>
      <Dialog.Root open={shouldPickCurrentTerm}>
        <Dialog.Content className="max-w-md">
          <Dialog.Header>
            <Dialog.Title>Choose current term</Dialog.Title>
            <Dialog.Description>
              No date-current term could be detected. Pick the term to use for
              this session.
            </Dialog.Description>
          </Dialog.Header>
          <Field>
            <Field.Label>Current term</Field.Label>
            <Select
              value={pendingCurrentTermId || undefined}
              onValueChange={setPendingCurrentTermId}
            >
              <Select.Trigger>
                <Select.Value placeholder="Select term" />
              </Select.Trigger>
              <Select.Content>
                {terms.map((term) => (
                  <Select.Item value={term.id} key={term.id}>
                    {term.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </Field>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={saveCurrentTerm}
              disabled={!pendingCurrentTermId || isSavingCurrentTerm}
            >
              {isSavingCurrentTerm ? "Saving..." : "Use this term"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}

function AssessmentRecordingSetupState({
  canManageClassroom,
  departments,
  effectiveDepartmentId,
  effectiveTermId,
  isLoading,
  message,
  onClassroomChange,
  onOpenClassroomOverview,
  onTermChange,
  selectedDepartment,
  selectedTerm,
  terms,
}: {
  canManageClassroom: boolean;
  departments: RecordingClassroomOption[];
  effectiveDepartmentId: string;
  effectiveTermId: string;
  isLoading: boolean;
  message: string;
  onClassroomChange: (departmentId: string) => void;
  onOpenClassroomOverview: () => void;
  onTermChange: (termId: string) => void;
  selectedDepartment?: RecordingClassroomOption | null;
  selectedTerm?: RecordingTermOption | null;
  terms: RecordingTermOption[];
}) {
  const selectedClassroomLabel =
    selectedDepartment?.displayName ||
    selectedDepartment?.departmentName ||
    "No classroom selected";
  const studentCount = selectedDepartment?._count?.studentSessionForms;
  const subjectCount = selectedDepartment?.subjects?.length;

  return (
    <div className="mx-auto mt-6 w-full max-w-4xl border-y border-border bg-background">
      <div className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Assessment recording setup
            </p>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading assessment context..." : message}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <Field.Label>Term</Field.Label>
              <Select
                value={effectiveTermId || undefined}
                onValueChange={onTermChange}
                disabled={!terms.length}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select term" />
                </Select.Trigger>
                <Select.Content>
                  {terms.map((term) => (
                    <Select.Item value={term.id} key={term.id}>
                      {term.label || term.title}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </Field>

            <Field>
              <Field.Label>Classroom</Field.Label>
              <Select
                dir="ltr"
                value={effectiveDepartmentId || undefined}
                onValueChange={onClassroomChange}
                disabled={!effectiveTermId || !departments.length}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select classroom" />
                </Select.Trigger>
                <Select.Content>
                  {departments.map((department) => (
                    <Select.Item value={department.id} key={department.id}>
                      <span dir="auto">
                        {department.displayName ?? department.departmentName}
                      </span>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </Field>
          </div>

          {canManageClassroom && selectedDepartment ? (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={onOpenClassroomOverview}
            >
              <PanelRightOpen className="size-4" />
              Open classroom overview
            </Button>
          ) : null}
        </div>

        <div className="border-t border-border pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            Current selection
          </p>
          <div className="mt-3 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <School className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  {selectedClassroomLabel}
                </p>
                <p className="text-muted-foreground">
                  {selectedDepartment?.classRoom?.name
                    ? `Class: ${selectedDepartment.classRoom.name}`
                    : "Choose a classroom to load the recording table."}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <BookOpenText className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  {selectedTerm?.label ||
                    selectedTerm?.title ||
                    "No term selected"}
                </p>
                <p className="text-muted-foreground">
                  {selectedTerm?.sessionTitle
                    ? `Session: ${selectedTerm.sessionTitle}`
                    : "Pick a term to see available classrooms."}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  {studentCount == null
                    ? "Student count unavailable"
                    : `${studentCount} student${studentCount === 1 ? "" : "s"}`}
                </p>
                <p className="text-muted-foreground">
                  {subjectCount == null
                    ? "Subject setup appears in the classroom overview."
                    : `${subjectCount} subject${subjectCount === 1 ? "" : "s"} configured for this term.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
