"use client";

import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@school-clerk/ui/dialog";
import { toast } from "@school-clerk/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, GitMerge, Users } from "lucide-react";
import { useMemo, useState } from "react";

type DuplicateGroup = {
  key: string;
  classroomName: string | null;
  memberCount: number;
  recommendedSurvivorId: string;
  members: Array<{
    studentId: string;
    displayName: string;
    classroomName: string | null;
    counts: {
      historyScore: number;
      assessmentRecords: number;
      attendanceRecords: number;
      financeCharges: number;
      directAssessmentRecords: number;
      directFinanceCharges: number;
      financePayments: number;
      guardianLinks: number;
      termForms: number;
    };
  }>;
};

type Props = {
  classroomDepartmentId?: string | null;
  sessionTermId?: string | null;
  studentId?: string | null;
  showCount?: boolean;
  compact?: boolean;
  className?: string;
};

export function StudentDuplicateAlert({
  classroomDepartmentId,
  sessionTermId,
  studentId,
  showCount = false,
  compact = false,
  className,
}: Props) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  const queryInput = {
    classroomDepartmentId: classroomDepartmentId || null,
    sessionTermId: sessionTermId || null,
    studentId: studentId || null,
  };

  const { data, isLoading } = useQuery(
    trpc.students.duplicateGroups.queryOptions(queryInput, {
      enabled: !studentId || Boolean(studentId),
    }),
  );

  const groups = (data?.groups ?? []) as DuplicateGroup[];
  const selectedGroup = useMemo(
    () => groups.find((group) => group.key === selectedGroupKey) ?? null,
    [groups, selectedGroupKey],
  );
  const recommendedSurvivor = selectedGroup?.members.find(
    (member) => member.studentId === selectedGroup.recommendedSurvivorId,
  );
  const duplicateStudentIds =
    selectedGroup?.members
      .filter((member) => member.studentId !== selectedGroup.recommendedSurvivorId)
      .map((member) => member.studentId) ?? [];

  const previewInput =
    selectedGroup && recommendedSurvivor
      ? {
          classroomDepartmentId: classroomDepartmentId || null,
          sessionTermId: sessionTermId || null,
          survivorStudentId: recommendedSurvivor.studentId,
          duplicateStudentIds,
        }
      : null;

  const { data: preview, isLoading: isPreviewLoading } = useQuery(
    trpc.students.previewDuplicateMerge.queryOptions(previewInput as never, {
      enabled: Boolean(previewInput),
    }),
  );

  const mergeMutation = useMutation(
    trpc.students.mergeDuplicates.mutationOptions({
      onSuccess() {
        toast({
          title: "Duplicate students merged",
          description: "The duplicate record was merged into the survivor.",
        });
        setSelectedGroupKey(null);
        qc.invalidateQueries({
          queryKey: trpc.students.duplicateGroups.queryKey(queryInput),
        });
        qc.invalidateQueries({
          queryKey: trpc.students.index.infiniteQueryKey(),
        });
        qc.invalidateQueries({
          queryKey: trpc.students.analytics.queryKey({}),
        });
      },
      onError(error) {
        toast({
          title: "Unable to merge duplicates",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  );

  if (isLoading && showCount) {
    return (
      <div className={className}>
        <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Checking student count and duplicate names...
        </div>
      </div>
    );
  }

  if (!data || (!showCount && groups.length === 0)) return null;

  return (
    <div className={className}>
      {showCount ? (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Students
            </div>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {data.totalStudents}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5" />
              Duplicates
            </div>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {data.duplicateGroupCount}
            </p>
          </div>
          <div className="hidden rounded-md border border-border bg-card px-4 py-3 sm:block">
            <div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
              <GitMerge className="h-3.5 w-3.5" />
              Affected
            </div>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {data.duplicateStudentCount}
            </p>
          </div>
        </div>
      ) : null}

      {groups.length > 0 ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>
            {groups.length === 1
              ? "Duplicate student name found"
              : `${groups.length} duplicate student names found`}
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex flex-col gap-3">
              <p>
                Review these records before deleting a student. The merge preview
                will recommend the record with the strongest history.
              </p>
              <div className="flex flex-col gap-2">
                {groups.map((group) => {
                  const survivor = group.members.find(
                    (member) => member.studentId === group.recommendedSurvivorId,
                  );
                  return (
                    <div
                      key={group.key}
                      className="flex flex-col gap-3 rounded-md border border-amber-200/70 bg-background/80 p-3 text-foreground sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {group.members[0]?.displayName || "Duplicate group"}
                          </span>
                          <Badge variant="outline">
                            {group.memberCount} records
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Recommended survivor:{" "}
                          {survivor?.displayName || "highest history record"}
                          {group.classroomName ? ` in ${group.classroomName}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={compact ? "outline" : "default"}
                        onClick={() => setSelectedGroupKey(group.key)}
                      >
                        Review merge
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ) : showCount ? (
        <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          No duplicate names found for this student scope.
        </div>
      ) : null}

      <Dialog
        open={Boolean(selectedGroup)}
        onOpenChange={(open) => !open && setSelectedGroupKey(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review duplicate merge</DialogTitle>
          </DialogHeader>
          {selectedGroup ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-border">
                {selectedGroup.members.map((member) => {
                  const isSurvivor =
                    member.studentId === selectedGroup.recommendedSurvivorId;
                  return (
                    <div
                      key={member.studentId}
                      className="flex flex-col gap-2 border-b border-border p-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{member.displayName}</span>
                          {isSurvivor ? <Badge>Recommended survivor</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          History score {member.counts.historyScore} ·{" "}
                          {member.counts.assessmentRecords +
                            member.counts.directAssessmentRecords}{" "}
                          assessments · {member.counts.attendanceRecords} attendance ·{" "}
                          {member.counts.financeCharges +
                            member.counts.directFinanceCharges}{" "}
                          charges · {member.counts.financePayments} payments
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {preview ? (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                  <p className="font-medium text-foreground">Records to move</p>
                  <p className="mt-1 text-muted-foreground">
                    {preview.recordsToMove.termForms} term forms,{" "}
                    {preview.recordsToMove.attendanceRecords} attendance records,{" "}
                    {preview.recordsToMove.assessmentRecords} assessment records,{" "}
                    {preview.recordsToMove.financeCharges} finance charges, and{" "}
                    {preview.recordsToMove.directFinancePayments} payments.
                  </p>
                  {preview.conflicts.length ? (
                    <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                      {preview.conflicts.map((conflict) => (
                        <p key={conflict}>{conflict}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-muted-foreground">
                      No blocking conflicts were found. The duplicate record will be
                      soft-deleted after references move to the survivor.
                    </p>
                  )}
                </div>
              ) : isPreviewLoading ? (
                <p className="text-sm text-muted-foreground">
                  Building merge preview...
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedGroupKey(null)}
              disabled={mergeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={!preview?.canMerge || mergeMutation.isPending || !previewInput}
              onClick={() => {
                if (!previewInput) return;
                mergeMutation.mutate(previewInput);
              }}
            >
              Merge duplicate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
