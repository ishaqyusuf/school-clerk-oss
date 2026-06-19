"use client";
import { switchSessionTerm } from "@/actions/cookies/auth-cookie";
import { AssessmentRecordingResultsTable } from "@/components/assessment-recording-results-table";
import { _trpc } from "@/components/static-trpc";
import { useAuth } from "@/hooks/use-auth";
import { useAssessmentRecordingParams } from "@/hooks/use-assessment-recording-params";
import { Button } from "@school-clerk/ui/button";
import { Dialog, Field, Select } from "@school-clerk/ui/composite";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

export function AssessmentRecording() {
  const { filters, permissions, setFilters } = useAssessmentRecordingParams();
  const auth = useAuth();
  const [pendingCurrentTermId, setPendingCurrentTermId] = useState("");
  const [isSavingCurrentTerm, setIsSavingCurrentTerm] = useState(false);
  const syncedTermRef = useRef<string | null>(null);
  const { data: contextOptions, isLoading: isLoadingContext } = useQuery(
    _trpc.assessments.getRecordingContextOptions.queryOptions({
      termId: filters.termId ?? null,
    }),
  );
  const terms = contextOptions?.terms ?? [];
  const departments = contextOptions?.classrooms ?? [];
  const effectiveTermId =
    (contextOptions?.scoped &&
    filters.termId &&
    terms.some((term) => term.id === filters.termId)
      ? filters.termId
      : null) ??
    (contextOptions?.scoped
      ? contextOptions.defaultTermId
      : filters.termId ?? contextOptions?.defaultTermId) ??
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
  const canOpenReportSheet = auth.role === "Admin";
  const shouldPickCurrentTerm =
    !isLoadingContext && !!contextOptions && !effectiveTermId && terms.length > 0;
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

  return (
    <>
      <div className="flex flex-col gap-4 px-2 py-3 sm:mx-auto sm:max-w-4xl sm:px-0 sm:py-4">
        <div className="mb-28">
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
            <div className="mx-auto mt-8 max-w-xl border-y border-border bg-background p-4 text-sm text-muted-foreground">
              {isLoadingContext ? "Loading assessment context..." : emptyStateMessage}
            </div>
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
