"use client";

import { AssessmentPublicLinksPanel } from "@/components/assessment-public-links-panel";
import {
  ScoreSaveStatus,
  ScoreSaveStatusProvider,
} from "@/components/assessment-recording/score-save-status";
import {
  SubjectChips,
  SubjectRail,
  type SubjectRailItem,
} from "@/components/assessment-recording/subject-rail";
import { AssessmentResultsScoreCell } from "@/components/assessment-results-score-cell";
import { AssessmentWorkbooksDialog } from "@/components/assessment-workbooks-dialog";
import { SubjectAssessments } from "@/components/subject-assessments";
import { SubmitClassStudentSheet } from "@/components/students/submit-class-student-sheet";
import {
  buildResultRows,
  filterResultStudents,
  filterResultSubjects,
  getAssessmentDisplayTitle,
  getSubjectFillingProgress,
} from "@school-clerk/assessment-results";
import { TenantLink as Link } from "@school-clerk/tenant-url/next";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { cn } from "@school-clerk/ui/cn";
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
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronsUpDown,
  CircleCheck,
  Ellipsis,
  ExternalLink,
  FileSpreadsheet,
  Link2,
  PanelRightOpen,
  Pencil,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import {
  type CSSProperties,
  Fragment,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAcademicDataDirection } from "./academic-data-direction/provider";
import { _trpc } from "./static-trpc";
import { useStudentNameFormat } from "./student-name-format/provider";

type ClassroomFilterOption = {
  id: string;
  displayName?: string | null;
  departmentName?: string | null;
};

type Props = {
  departmentId: string;
  termId: string;
  termLabel?: string | null;
  selectedSubjectId?: string | null;
  classrooms?: ClassroomFilterOption[];
  onClassroomChange?: (departmentId: string) => void;
  onOpenClassroomOverview?: () => void;
  publicToken?: string | null;
  reportSheetHref?: string | null;
};

const STUDENT_COLUMN_WIDTH = 220;
const SCORE_COLUMN_WIDTH = 76;
const DONE_COLUMN_WIDTH = 36;
const SCORE_CELL_WIDTH = "w-[76px] min-w-[76px] max-w-[76px]";

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

/** Takes the leftover width so the table spans the page while scores stay beside names. */
function FillerHead({ rowSpan }: { rowSpan?: number }) {
  return (
    <TableHead
      aria-hidden="true"
      rowSpan={rowSpan}
      className="hidden p-0 sm:table-cell"
    />
  );
}

export function AssessmentRecordingResultsTable(props: Props) {
  return (
    <ScoreSaveStatusProvider>
      <AssessmentRecordingWorkspace {...props} />
    </ScoreSaveStatusProvider>
  );
}

function AssessmentRecordingWorkspace({
  departmentId,
  termId,
  termLabel,
  selectedSubjectId,
  classrooms = [],
  onClassroomChange,
  onOpenClassroomOverview,
  publicToken,
  reportSheetHref,
}: Props) {
  const academicDataDirection = useAcademicDataDirection();
  const studentNameFormat = useStudentNameFormat();
  const isRtl = academicDataDirection === "rtl";
  const [subjectFilterIds, setSubjectFilterIds] = useState<string[]>([]);
  const [multipleSubjects, setMultipleSubjects] = useState(false);
  const [nameSearch, setNameSearch] = useState("");
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isWorkbooksOpen, setIsWorkbooksOpen] = useState(false);
  const [isPublicLinkOpen, setIsPublicLinkOpen] = useState(false);
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
  const subjectFillingProgress = useMemo(
    () => getSubjectFillingProgress({
      subjects: allSubjects,
      students: data?.studentTermForms ?? [],
    }),
    [allSubjects, data?.studentTermForms],
  );

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
        nameFormat: studentNameFormat,
      }),
    [data?.studentTermForms, deferredNameSearch, studentNameFormat],
  );
  const resultRows = useMemo(
    () =>
      buildResultRows({
        subjects: visibleSubjects,
        students: filteredStudents,
        nameFormat: studentNameFormat,
      }),
    [filteredStudents, studentNameFormat, visibleSubjects],
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

  const railSubjects: SubjectRailItem[] = useMemo(
    () =>
      allSubjects.map((subject) => {
        const progress = subjectFillingProgress.get(subject.id);
        return {
          id: subject.id,
          title: subject.subject.title ?? "Subject",
          completed: progress?.completed ?? 0,
          total: progress?.total ?? 0,
          hasAssessments: (subject.assessments ?? []).length > 0,
        };
      }),
    [allSubjects, subjectFillingProgress],
  );
  const singleSubject =
    visibleSubjects.length === 1 ? visibleSubjects[0] : null;
  const singleSubjectProgress = singleSubject
    ? subjectFillingProgress.get(singleSubject.id)
    : null;
  const showDoneColumn = !!singleSubject?.assessments.length;
  const scoreColumnCount = visibleSubjects.reduce(
    (total, subject) => total + Math.max(subject.assessments.length, 1),
    0,
  );
  const tableWidth =
    STUDENT_COLUMN_WIDTH +
    scoreColumnCount * SCORE_COLUMN_WIDTH +
    (showDoneColumn ? DONE_COLUMN_WIDTH : 0);
  const phoneTableMinWidth =
    148 +
    scoreColumnCount * SCORE_COLUMN_WIDTH +
    (showDoneColumn ? DONE_COLUMN_WIDTH : 0);

  const selectedClassroom = classrooms.find(
    (classroom) => classroom.id === departmentId,
  );
  const classroomTitle =
    selectedClassroom?.displayName ||
    selectedClassroom?.departmentName ||
    data?.departmentName ||
    "Classroom";
  const canSwitchClassroom = classrooms.length > 1 && !!onClassroomChange;
  const studentCount = data?.studentTermForms?.length ?? 0;
  const contextLine = [
    termLabel,
    `${studentCount} student${studentCount === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const selectSubject = (subjectId: string) => {
    setSubjectFilterIds((current) => {
      if (!multipleSubjects) return [subjectId];
      if (!current.includes(subjectId)) return [...current, subjectId];
      const next = current.filter((id) => id !== subjectId);
      return next.length ? next : current;
    });
  };
  const changeMultipleSubjects = (multiple: boolean) => {
    setMultipleSubjects(multiple);
    if (!multiple) {
      setSubjectFilterIds((current) => current.slice(0, 1));
    }
  };

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
      <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b pb-3">
        <div className="min-w-0 flex-1 basis-56">
          {canSwitchClassroom ? (
            <DropdownMenu dir="ltr">
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="-mx-1 inline-flex max-w-full items-center gap-1.5 rounded-md px-1 text-start text-lg font-semibold tracking-tight hover:bg-accent sm:text-xl"
                  aria-label={`Classroom: ${classroomTitle}. Change classroom`}
                >
                  <span className="truncate" dir="auto">
                    {classroomTitle}
                  </span>
                  <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="start" className="w-64">
                {classrooms.map((classroom) => (
                  <DropdownMenu.Item
                    key={classroom.id}
                    dir="ltr"
                    onSelect={() => onClassroomChange?.(classroom.id)}
                  >
                    <span className="min-w-0 flex-1 truncate" dir="auto">
                      {classroom.displayName ?? classroom.departmentName}
                    </span>
                    {classroom.id === departmentId ? (
                      <Check className="size-4 shrink-0" />
                    ) : null}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu>
          ) : (
            <h1
              className="truncate text-lg font-semibold tracking-tight sm:text-xl"
              dir="auto"
            >
              {classroomTitle}
            </h1>
          )}
          <p className="text-xs text-muted-foreground">{contextLine}</p>
        </div>
        <ScoreSaveStatus />
        {!publicToken ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden gap-2 sm:inline-flex"
              onClick={() => setIsAddStudentOpen(true)}
            >
              <UserPlus className="size-4" />
              Add student
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden gap-2 sm:inline-flex"
              onClick={() => setIsWorkbooksOpen(true)}
            >
              <FileSpreadsheet className="size-4" />
              Workbooks
            </Button>
            <DropdownMenu modal={false}>
              <DropdownMenu.Trigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-8 px-0"
                  aria-label="More actions"
                >
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" className="w-60">
                <DropdownMenu.Item
                  className="gap-2 sm:hidden"
                  onSelect={() => setIsAddStudentOpen(true)}
                >
                  <UserPlus className="size-4" />
                  Add student
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="gap-2 sm:hidden"
                  onSelect={() => setIsWorkbooksOpen(true)}
                >
                  <FileSpreadsheet className="size-4" />
                  Assessment workbooks
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="gap-2"
                  disabled={!subjectFilterIds.length}
                  onSelect={() => setIsPublicLinkOpen(true)}
                >
                  <Link2 className="size-4" />
                  Public recording link
                </DropdownMenu.Item>
                {reportSheetHref || onOpenClassroomOverview ? (
                  <DropdownMenu.Separator />
                ) : null}
                {reportSheetHref ? (
                  <DropdownMenu.Item asChild className="gap-2">
                    <Link href={reportSheetHref} target="_blank">
                      <ExternalLink className="size-4" />
                      Report sheet
                    </Link>
                  </DropdownMenu.Item>
                ) : null}
                {onOpenClassroomOverview ? (
                  <DropdownMenu.Item
                    className="gap-2"
                    onSelect={onOpenClassroomOverview}
                  >
                    <PanelRightOpen className="size-4" />
                    Classroom overview
                  </DropdownMenu.Item>
                ) : null}
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        ) : null}
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden lg:block">
          <div className="sticky top-4">
            <SubjectRail
              subjects={railSubjects}
              selectedIds={subjectFilterIds}
              multiple={multipleSubjects}
              onSelect={selectSubject}
              onMultipleChange={changeMultipleSubjects}
            />
          </div>
        </aside>
        <div className="sticky top-0 z-40 -mx-2 bg-background px-2 pt-1 sm:mx-0 sm:px-0 lg:hidden">
          <SubjectChips
            subjects={railSubjects}
            selectedIds={subjectFilterIds}
            multiple={multipleSubjects}
            onSelect={selectSubject}
          />
        </div>

        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {singleSubject ? (
              <>
                <h2 className="truncate text-base font-semibold" dir="auto">
                  {singleSubject.subject.title}
                </h2>
                {singleSubject.assessments.length && singleSubjectProgress ? (
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {singleSubjectProgress.completed} of{" "}
                    {singleSubjectProgress.total} complete
                  </span>
                ) : null}
                {!publicToken ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => setOpenSubjectId(singleSubject.id)}
                  >
                    <Pencil className="size-3.5" />
                    Edit assessments
                  </Button>
                ) : null}
              </>
            ) : (
              <h2 className="text-base font-semibold">
                {visibleSubjects.length} subjects
              </h2>
            )}
            <div className="relative w-full sm:ms-auto sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={nameSearch}
                onChange={(event) => setNameSearch(event.target.value)}
                placeholder="Search student"
                aria-label="Search student name"
                className="h-9 pl-9 pr-9"
              />
              {nameSearch ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setNameSearch("")}
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          <div
            className={cn(
              "w-full rounded-md border bg-background",
              !singleSubject && "overflow-x-auto",
            )}
            style={
              {
                "--recording-table-w": `${tableWidth}px`,
                "--recording-table-min-w": singleSubject
                  ? "0px"
                  : `${phoneTableMinWidth}px`,
              } as CSSProperties
            }
          >
            <Table
              dir={academicDataDirection}
              className="w-full min-w-[var(--recording-table-min-w)] table-fixed border-collapse sm:min-w-[var(--recording-table-w)]"
            >
              <TableHeader className="sticky top-12 z-30 bg-background shadow-sm lg:top-0 [&_th]:bg-background">
                {singleSubject ? null : (
                  <TableRow>
                    <TableHead
                      rowSpan={2}
                      className={cn(
                        "sticky z-20 border-e sm:w-[220px]",
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
                          className="max-w-full truncate font-semibold underline-offset-4 enabled:hover:underline disabled:cursor-default"
                          dir="auto"
                        >
                          {subject.subject.title}
                        </button>
                      </TableHead>
                    ))}
                    <FillerHead rowSpan={2} />
                  </TableRow>
                )}
                <TableRow>
                  {singleSubject ? (
                    <TableHead
                      className={cn(
                        "sticky z-20 border-e sm:w-[220px]",
                        isRtl ? "right-0" : "left-0",
                      )}
                    >
                      Student
                    </TableHead>
                  ) : null}
                  {visibleSubjects.map((subject) => (
                    <Fragment key={subject.id}>
                      {subject.assessments.length ? (
                        subject.assessments.map((assessment) => (
                          <TableHead
                            key={`${subject.id}-${assessment.id}`}
                            className={cn(
                              SCORE_CELL_WIDTH,
                              "h-auto border-e px-1 py-1.5 text-center text-xs leading-tight",
                            )}
                            title={getAssessmentDisplayTitle(assessment)}
                          >
                            <div className="truncate font-medium text-foreground">
                              {getAssessmentDisplayTitle(assessment)}
                            </div>
                            <div className="text-muted-foreground">
                              ({assessment.obtainable ?? "-"})
                            </div>
                          </TableHead>
                        ))
                      ) : (
                        <TableHead
                          className={cn(
                            SCORE_CELL_WIDTH,
                            "border-e text-center text-xs text-muted-foreground",
                          )}
                        >
                          No assessments
                        </TableHead>
                      )}
                    </Fragment>
                  ))}
                  {showDoneColumn ? (
                    <TableHead className="w-9 min-w-9 px-0">
                      <span className="sr-only">Complete</span>
                    </TableHead>
                  ) : null}
                  {singleSubject ? <FillerHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultRows.length ? (
                  resultRows.map((row, rowIndex) => {
                    let scoreColumn = 0;
                    const isComplete =
                      showDoneColumn &&
                      (row.subjectTotals[0]?.cells ?? []).every(
                        (cell) => cell.result?.obtained != null,
                      );
                    return (
                      <TableRow
                        key={row.student.id}
                        className="hover:bg-muted/30 focus-within:bg-accent/40"
                      >
                        <TableCell
                          className={cn(
                            "sticky z-10 whitespace-nowrap border-e bg-background sm:w-[220px]",
                            isRtl ? "right-0" : "left-0",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {rowIndex + 1}.
                            </span>
                            <span className="min-w-0 truncate" dir="auto">
                              {row.studentName}
                            </span>
                            <StudentGenderBadge
                              gender={row.student.student?.gender}
                            />
                            {row.student.registrationReviewStatus ===
                            "PENDING" ? (
                              <Badge
                                variant="warning"
                                className="h-5 shrink-0 px-1.5 text-[10px]"
                              >
                                Pending
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        {row.subjectTotals.map((subjectTotal) => (
                          <Fragment key={subjectTotal.subject.id}>
                            {subjectTotal.cells.length ? (
                              subjectTotal.cells.map((cell) => {
                                const gridCol = scoreColumn++;
                                return (
                                  <AssessmentResultsScoreCell
                                    key={`${row.student.id}-${cell.assessment.id}`}
                                    assessmentId={cell.assessment.id}
                                    obtainable={cell.assessment.obtainable}
                                    studentTermFormId={row.student.id}
                                    studentId={row.student.student?.id}
                                    departmentSubjectId={subjectTotal.subject.id}
                                    publicToken={publicToken}
                                    result={cell.result}
                                    gridRow={rowIndex}
                                    gridCol={gridCol}
                                    widthClass={SCORE_CELL_WIDTH}
                                    label={`${row.studentName}, ${subjectTotal.subject.subject.title} ${getAssessmentDisplayTitle(cell.assessment)} (${cell.assessment.obtainable ?? "-"})`}
                                  />
                                );
                              })
                            ) : (
                              <TableCell className="border-e text-center text-muted-foreground">
                                -
                              </TableCell>
                            )}
                          </Fragment>
                        ))}
                        {showDoneColumn ? (
                          <TableCell className="w-9 px-0 text-center">
                            {isComplete ? (
                              <CircleCheck
                                className="mx-auto size-4 text-green-600"
                                aria-label="Complete"
                              />
                            ) : null}
                          </TableCell>
                        ) : null}
                        <TableCell
                          aria-hidden="true"
                          className="hidden p-0 sm:table-cell"
                        />
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={
                        2 + scoreColumnCount + (showDoneColumn ? 1 : 0)
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
          <p className="hidden flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground md:flex">
            <span>
              <kbd className="rounded border px-1 font-mono text-[11px]">
                Enter
              </kbd>{" "}
              next student
            </span>
            <span>
              <kbd className="rounded border px-1 font-mono text-[11px]">
                Tab
              </kbd>{" "}
              next column
            </span>
            <span>
              <kbd className="rounded border px-1 font-mono text-[11px]">
                Esc
              </kbd>{" "}
              undo cell
            </span>
          </p>
        </section>
      </div>

      {!publicToken ? (
        <>
          <SubmitClassStudentSheet
            classrooms={[
              {
                id: departmentId,
                displayName:
                  selectedClassroom?.displayName ?? "Current classroom",
              },
            ]}
            initialClassroomId={departmentId}
            termId={termId}
            open={isAddStudentOpen}
            onOpenChange={setIsAddStudentOpen}
          />
          <AssessmentWorkbooksDialog
            departmentId={departmentId}
            termId={termId}
            direction={academicDataDirection}
            subjects={allSubjects}
            initiallySelectedSubjectIds={subjectFilterIds}
            open={isWorkbooksOpen}
            onOpenChange={setIsWorkbooksOpen}
          />
          <AssessmentPublicLinksPanel
            allSubjectIds={allSubjects.map((subject) => subject.id)}
            departmentId={departmentId}
            selectedSubjectIds={subjectFilterIds}
            termId={termId}
            open={isPublicLinkOpen}
            onOpenChange={setIsPublicLinkOpen}
          />
        </>
      ) : null}
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
