"use client";

import { AssessmentResultsScoreCell } from "@/components/assessment-results-score-cell";
import { AssessmentPublicLinksPanel } from "@/components/assessment-public-links-panel";
import { AssessmentWorkbooksDialog } from "@/components/assessment-workbooks-dialog";
import { SubjectAssessments } from "@/components/subject-assessments";
import {
  buildResultRows,
  filterResultStudents,
  filterResultSubjects,
  getAssessmentDisplayTitle,
  getStudentDisplayName,
} from "@school-clerk/assessment-results";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Dialog, DropdownMenu } from "@school-clerk/ui/composite";
import { Input } from "@school-clerk/ui/input";
import { Spinner } from "@school-clerk/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@school-clerk/ui/table";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, PanelRightOpen, School, Search, X } from "lucide-react";
import {
  Fragment,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { _trpc } from "./static-trpc";
import { useAcademicDataDirection } from "./academic-data-direction/provider";
import { cn } from "@school-clerk/ui/cn";

type ClassroomFilterOption = {
  id: string;
  displayName?: string | null;
  departmentName?: string | null;
};

type SubjectFillingProgress = {
  completed: number;
  total: number;
};

type Props = {
  departmentId: string;
  termId: string;
  selectedSubjectId?: string | null;
  classrooms?: ClassroomFilterOption[];
  onClassroomChange?: (departmentId: string) => void;
  onOpenClassroomOverview?: () => void;
  publicToken?: string | null;
  reportSheetHref?: string | null;
};

function StudentGenderBadge({ gender }: { gender?: string | null }) {
  const label = gender === "Male" ? "M" : gender === "Female" ? "F" : null;

  if (!label) return null;

  return (
    <Badge
      variant="outline"
      className="h-5 shrink-0 px-1.5 text-[10px] font-semibold leading-none"
      aria-label={`Gender ${gender}`}
    >
      {label}
    </Badge>
  );
}

export function AssessmentRecordingResultsTable({
  departmentId,
  termId,
  selectedSubjectId,
  classrooms = [],
  onClassroomChange,
  onOpenClassroomOverview,
  publicToken,
  reportSheetHref,
}: Props) {
  const academicDataDirection = useAcademicDataDirection();
  const isRtl = academicDataDirection === "rtl";
  const [subjectFilterIds, setSubjectFilterIds] = useState<string[]>([]);
  const [nameSearch, setNameSearch] = useState("");
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
  const deferredNameSearch = useDeferredValue(nameSearch);

  const classroomReportQuery = useQuery(
    _trpc.assessments.getClassroomReportSheet.queryOptions(
      {
        departmentId,
        sessionTermId: termId,
      },
      {
        enabled: !publicToken && !!departmentId && !!termId,
      },
    ),
  );
  const publicLinkQuery = useQuery(
    _trpc.assessments.getPublicAssessmentLink.queryOptions(
      {
        token: publicToken ?? "",
      },
      {
        enabled: !!publicToken,
      },
    ),
  );
  const data = publicToken
    ? publicLinkQuery.data?.report
    : classroomReportQuery.data;
  const isLoading = publicToken
    ? publicLinkQuery.isLoading
    : classroomReportQuery.isLoading;
  const publicLinkError = publicToken ? publicLinkQuery.error : null;
  const publicLinkStatus = publicLinkQuery.data?.status;
  const publicLinkMessage = publicLinkQuery.data?.message;

  const allSubjects = data?.subjects ?? [];
  const firstSubjectId = allSubjects[0]?.id;
  const subjectFillingProgress = useMemo(() => {
    const students = data?.studentTermForms ?? [];
    const progress = new Map<string, SubjectFillingProgress>();

    for (const subject of allSubjects) {
      const assessments = subject.assessments ?? [];
      const completed = assessments.length
        ? students.filter((student) =>
            assessments.every((assessment) =>
              assessment.assessmentResults?.some(
                (result) =>
                  result.studentTermFormId === student.id &&
                  result.obtained != null,
              ),
            ),
          ).length
        : 0;

      progress.set(subject.id, {
        completed,
        total: students.length,
      });
    }

    return progress;
  }, [allSubjects, data?.studentTermForms]);

  useEffect(() => {
    if (selectedSubjectId) {
      setSubjectFilterIds([selectedSubjectId]);
      return;
    }

    if (firstSubjectId) {
      setSubjectFilterIds([firstSubjectId]);
    }
  }, [firstSubjectId, selectedSubjectId]);

  const visibleSubjects = useMemo(
    () =>
      filterResultSubjects({
        subjects: allSubjects,
        selectedSubjectIds: subjectFilterIds,
      }),
    [allSubjects, subjectFilterIds],
  );
  const filteredStudents = useMemo(
    () =>
      filterResultStudents({
        students: data?.studentTermForms ?? [],
        search: deferredNameSearch,
      }),
    [data?.studentTermForms, deferredNameSearch],
  );
  const resultRows = useMemo(
    () =>
      buildResultRows({
        subjects: visibleSubjects,
        students: filteredStudents,
      }),
    [filteredStudents, visibleSubjects],
  );
  const openSubjectOverview = useQuery(
    _trpc.subjects.overview.queryOptions(
      {
        departmentSubjectId: openSubjectId ?? "",
      },
      {
        enabled: !!openSubjectId,
      },
    ),
  );
  const openSubjectTitle =
    allSubjects.find((subject) => subject.id === openSubjectId)?.subject
      .title ?? null;

  const subjectFilterLabel = subjectFilterIds.length
    ? `${subjectFilterIds.length} selected`
    : "All subjects";
  const selectedSubjectProgress =
    subjectFilterIds.length === 1
      ? subjectFillingProgress.get(subjectFilterIds[0] ?? "")
      : null;
  const selectedClassroom = classrooms.find(
    (classroom) => classroom.id === departmentId,
  );
  const selectedClassroomLabel =
    selectedClassroom?.displayName ||
    selectedClassroom?.departmentName ||
    "Select classroom";

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Spinner size={16} />
        Loading students...
      </div>
    );
  }

  if (publicToken && publicLinkStatus && publicLinkStatus !== "APPROVED") {
    return (
      <div className="mx-auto mt-8 max-w-xl border-y bg-background p-4 text-sm text-muted-foreground">
        {publicLinkMessage ?? "This public assessment link is not available."}
      </div>
    );
  }

  if (publicToken && publicLinkError) {
    return (
      <div className="mx-auto mt-8 max-w-xl border-y bg-background p-4 text-sm text-muted-foreground">
        This public assessment link is invalid or no longer available.
      </div>
    );
  }

  if (!data?.studentTermForms?.length) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
        <p>No students found for this classroom in the selected term.</p>
        {onOpenClassroomOverview ? (
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
    );
  }

  return (
    <>
      <div className="border-y bg-background">
        <div className="flex flex-col gap-3 border-b bg-muted/10 p-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={nameSearch}
              onChange={(event) => setNameSearch(event.target.value)}
              placeholder="Search student name"
              className="pl-9 pr-9"
            />
            {nameSearch ? (
              <button
                type="button"
                onClick={() => setNameSearch("")}
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            <span className="text-xs text-muted-foreground">
              Click a subject to update assessments.
            </span>
            {classrooms.length ? (
              <DropdownMenu dir="ltr">
                <DropdownMenu.Trigger asChild>
                  <Button
                    variant="outline"
                    className="min-w-0 max-w-full justify-start gap-2 sm:max-w-56"
                  >
                    <School className="size-4 shrink-0" />
                    <span className="truncate" dir="auto">
                      {selectedClassroomLabel}
                    </span>
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end" className="w-64">
                  {classrooms.map((classroom) => (
                    <DropdownMenu.Item
                      key={classroom.id}
                      dir="ltr"
                      onSelect={() => onClassroomChange?.(classroom.id)}
                    >
                      <span dir="auto">
                        {classroom.displayName ?? classroom.departmentName}
                      </span>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu>
            ) : null}
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button variant="outline" className="gap-2">
                  <BookOpenText className="size-4" />
                  <span>{subjectFilterLabel}</span>
                  {selectedSubjectProgress ? (
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {selectedSubjectProgress.completed}/
                      {selectedSubjectProgress.total}
                    </span>
                  ) : null}
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" className="w-64">
                <DropdownMenu.Item
                  onSelect={() =>
                    setSubjectFilterIds(
                      allSubjects.map((subject) => subject.id),
                    )
                  }
                >
                  Select all
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => setSubjectFilterIds([])}>
                  Clear selection
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                {allSubjects.map((subject) => (
                  <DropdownMenu.CheckboxItem
                    key={subject.id}
                    checked={subjectFilterIds.includes(subject.id)}
                    onSelect={(event) => event.preventDefault()}
                    onCheckedChange={(value) => {
                      setSubjectFilterIds((current) =>
                        value
                          ? [...current, subject.id]
                          : current.filter((id) => id !== subject.id),
                      );
                    }}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate" dir="auto">
                        {subject.subject.title}
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                        {subjectFillingProgress.get(subject.id)?.completed ?? 0}
                        /{subjectFillingProgress.get(subject.id)?.total ?? 0}
                      </span>
                    </span>
                  </DropdownMenu.CheckboxItem>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu>
            {!publicToken ? (
              <>
                <AssessmentWorkbooksDialog
                  departmentId={departmentId}
                  termId={termId}
                  direction={academicDataDirection}
                  subjects={allSubjects}
                  initiallySelectedSubjectIds={subjectFilterIds}
                />
                <AssessmentPublicLinksPanel
                  allSubjectIds={allSubjects.map((subject) => subject.id)}
                  departmentId={departmentId}
                  selectedSubjectIds={subjectFilterIds}
                  termId={termId}
                />
              </>
            ) : null}
            {reportSheetHref ? (
              <Link
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                target="_blank"
                href={reportSheetHref}
              >
                Report Sheet
              </Link>
            ) : null}
          </div>
        </div>
        <Table
          dir={academicDataDirection}
          className="table-fixed border-collapse"
        >
          <TableHeader className="sticky top-0 z-30 bg-background shadow-sm [&_th]:bg-background">
            <TableRow>
              <TableHead
                rowSpan={2}
                className={cn(
                  "sticky z-20 w-[180px] min-w-[180px] border-e sm:w-[200px] sm:min-w-[200px]",
                  isRtl ? "right-0" : "left-0",
                )}
              >
                Student
              </TableHead>
              {visibleSubjects.map((subject) => (
                <TableHead
                  key={subject.id}
                  colSpan={Math.max(subject.assessments.length, 1)}
                  className="border-e text-center"
                >
                  <button
                    type="button"
                    disabled={!!publicToken}
                    onClick={() => {
                      if (publicToken) return;
                      setOpenSubjectId(subject.id);
                    }}
                    className="font-semibold underline-offset-4 enabled:hover:underline disabled:cursor-default"
                  >
                    {subject.subject.title}
                  </button>
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              {visibleSubjects.map((subject) => (
                <Fragment key={subject.id}>
                  {subject.assessments.length ? (
                    subject.assessments.map((assessment) => (
                      <TableHead
                        key={`${subject.id}-${assessment.id}`}
                        className="w-[70px] min-w-[70px] max-w-[70px] border-e px-1 text-center text-xs"
                      >
                        <div>{getAssessmentDisplayTitle(assessment)}</div>
                        <div className="text-muted-foreground">
                          ({assessment.obtainable ?? "Uncapped"})
                        </div>
                      </TableHead>
                    ))
                  ) : (
                    <TableHead className="w-[70px] min-w-[70px] max-w-[70px] border-e text-center text-xs text-muted-foreground">
                      No assessments
                    </TableHead>
                  )}
                </Fragment>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {resultRows.length ? (
              resultRows.map((row, index) => (
                <TableRow key={row.student.id} className="hover:bg-muted/30">
                  <TableCell
                    className={cn(
                      "sticky z-10 w-[180px] min-w-[180px] whitespace-nowrap border-e bg-background sm:w-[200px] sm:min-w-[200px]",
                      isRtl ? "right-0" : "left-0",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="shrink-0 tabular-nums">
                        {index + 1}.
                      </span>
                      <span className="min-w-0 truncate" dir="auto">
                        {getStudentDisplayName(row.student.student)}
                      </span>
                      <StudentGenderBadge
                        gender={row.student.student?.gender}
                      />
                    </div>
                  </TableCell>
                  {row.subjectTotals.map((subjectTotal) => (
                    <Fragment key={subjectTotal.subject.id}>
                      {subjectTotal.cells.length ? (
                        subjectTotal.cells.map((cell) => (
                          <AssessmentResultsScoreCell
                            key={`${row.student.id}-${cell.assessment.id}`}
                            assessmentId={cell.assessment.id}
                            obtainable={cell.assessment.obtainable}
                            studentTermFormId={row.student.id}
                            studentId={row.student.student?.id}
                            departmentSubjectId={subjectTotal.subject.id}
                            publicToken={publicToken}
                            result={cell.result}
                          />
                        ))
                      ) : (
                        <TableCell className="border-e text-center text-muted-foreground">
                          -
                        </TableCell>
                      )}
                    </Fragment>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={
                    1 +
                    visibleSubjects.reduce(
                      (total, subject) =>
                        total + Math.max(subject.assessments.length, 1),
                      0,
                    )
                  }
                  className="h-24 border-e text-center text-muted-foreground"
                >
                  No students match the current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog.Root
        open={!!openSubjectId}
        onOpenChange={(open) => {
          if (!open) setOpenSubjectId(null);
        }}
      >
        <Dialog.Content className="max-h-[90vh] max-w-5xl overflow-auto rounded-none border-y border-x-0 shadow-none sm:border-x">
          <Dialog.Header>
            <Dialog.Title>
              {openSubjectTitle
                ? `Subject assessments - ${openSubjectTitle}`
                : "Subject assessments"}
            </Dialog.Title>
            <Dialog.Description>
              Add or edit the assessment columns shown in this table.
            </Dialog.Description>
          </Dialog.Header>
          {openSubjectOverview.data ? (
            <SubjectAssessments
              overview={openSubjectOverview.data}
              showRecordSubmissionAction={false}
            />
          ) : (
            <div className="flex h-32 items-center justify-center">
              <Spinner size={16} />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
