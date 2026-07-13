import { TableSkeleton } from "../tables/skeleton";
import { Suspense, useEffect, useState } from "react";
import { Card, CardContent } from "@school-clerk/ui/card";
import { Button } from "@school-clerk/ui/button";
import {
  AlertTriangle,
  CalendarDays,
  GraduationCap,
  IdCard,
  Info,
  MoveRight,
  Trash2,
  User,
} from "lucide-react";
import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { cn } from "@school-clerk/ui/cn";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { Spinner } from "@school-clerk/ui/spinner";
import { useStudentParams } from "@/hooks/use-student-params";

function fullClassName(term?: {
  classDisplayName?: string | null;
  departmentName?: string | null;
}) {
  return term?.classDisplayName || term?.departmentName || "--";
}

export function StudentOverview({}) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content />
    </Suspense>
  );
}
function Content({}) {
  const { overviewData, activeStudentTerm, selectTerm } =
    useStudentOverviewSheet();

  const student = overviewData?.student;
  const currentTerm = activeStudentTerm;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500 sm:space-y-6">
      <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IdCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Student ID
                </p>
                <p className="text-sm font-bold text-foreground font-mono">
                  {student?.id ? student.id.slice(0, 8) : "--"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Class
                </p>
                <p className="text-sm font-bold text-foreground">
                  {fullClassName(currentTerm)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Current Term
                </p>
                <p className="text-sm font-bold text-foreground">
                  {currentTerm?.term || "--"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Gender
                </p>
                <p className="text-sm font-bold text-foreground">
                  {student?.gender || "--"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <StudentManagementActions />

      {overviewData?.studentTerms && overviewData.studentTerms.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr] xl:gap-6">
          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="p-0">
              <div className="border-b border-border px-4 py-4 sm:px-5">
                <h3 className="text-base font-bold text-foreground">
                  Term Enrollment History
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review the student&apos;s academic timeline and switch between
                  enrolled terms.
                </p>
              </div>
              <div className="divide-y divide-border">
                {overviewData.studentTerms.map((term, index) => {
                  const isActive = currentTerm?.termId === term.termId;

                  return (
                    <button
                      key={index}
                      className={cn(
                        "flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:px-5",
                        isActive && "bg-muted/50"
                      )}
                      onClick={() =>
                        selectTerm(term.termId, term.studentTermId || null)
                      }
                      type="button"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={cn(
                            "size-2.5 shrink-0 rounded-full",
                            term.studentTermId
                              ? "bg-primary"
                              : "bg-muted-foreground/40"
                          )}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {term.term}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {fullClassName(term) || "Class pending assignment"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "w-fit rounded-full border px-2.5 py-1 text-xs font-medium sm:shrink-0",
                          term.studentTermId
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground"
                        )}
                      >
                        {term.studentTermId ? "Enrolled" : "Not enrolled"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="flex h-full flex-col gap-4 p-4 sm:p-5">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Current Selection
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Active term details used across attendance, academics, and
                  payments.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Selected Term
                </p>
                <p className="mt-2 break-words text-lg font-semibold text-foreground">
                  {currentTerm?.term || "--"}
                </p>
                <p className="mt-1 break-words text-sm text-muted-foreground">
                  {fullClassName(currentTerm) || "No class assigned yet"}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                    <Info className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Overview Notes
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Enrollment status is resolved from the student&apos;s term
                      form records, so promoted students remain available across
                      the active term experience.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function canManageStudents(role?: string | null) {
  return role === "ADMIN" || role === "Admin" || role === "Registrar";
}

function StudentManagementActions() {
  const svc = useStudentOverviewSheet();
  const auth = useAuth();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setParams } = useStudentParams();
  const studentId = svc.overviewData?.student?.id;
  const term = svc.activeStudentTerm;
  const currentClassroomDepartmentId = term?.departmentId ?? "";
  const [selectedClassroomDepartmentId, setSelectedClassroomDepartmentId] =
    useState(currentClassroomDepartmentId);

  useEffect(() => {
    setSelectedClassroomDepartmentId(currentClassroomDepartmentId);
  }, [currentClassroomDepartmentId]);

  const canManage = canManageStudents(auth.role);
  const { data: classrooms, isLoading: isLoadingClassrooms } = useQuery(
    trpc.classrooms.getClassroomsForSession.queryOptions(term?.termSessionId, {
      enabled: canManage && Boolean(term?.termSessionId),
    }),
  );

  const invalidateStudentData = () => {
    if (studentId) {
      queryClient.invalidateQueries({
        queryKey: trpc.students.overview.queryKey({ studentId }),
      });
    }
    queryClient.invalidateQueries({
      queryKey: trpc.students.index.infiniteQueryKey(),
    });
    queryClient.invalidateQueries({
      queryKey: trpc.students.analytics.queryKey(),
    });
    svc.refresh();
  };

  const deleteStudentMutation = useMutation(
    trpc.students.deleteStudent.mutationOptions({
      onSuccess() {
        invalidateStudentData();
        if (svc.isSheetMode) {
          setParams(null);
        }
      },
      meta: {
        toastTitle: {
          error: "Unable to delete student",
          loading: "Deleting student...",
          success: "Student deleted.",
        },
      },
    }),
  );

  const deleteTermSheetMutation = useMutation(
    trpc.students.deleteTermSheet.mutationOptions({
      onSuccess() {
        if (term?.termId) {
          svc.selectTerm(term.termId, null);
        }
        invalidateStudentData();
      },
      meta: {
        toastTitle: {
          error: "Unable to delete term sheet",
          loading: "Deleting term sheet...",
          success: "Term sheet deleted.",
        },
      },
    }),
  );

  const changeClassMutation = useMutation(
    trpc.students.changeStudentClass.mutationOptions({
      onSuccess() {
        invalidateStudentData();
      },
      meta: {
        toastTitle: {
          error: "Unable to change class",
          loading: "Changing class...",
          success: "Student class changed.",
        },
      },
    }),
  );

  if (!canManage || !studentId) return null;

  const hasTermSheet = Boolean(term?.studentTermId);
  const hasClassChange =
    hasTermSheet &&
    selectedClassroomDepartmentId &&
    selectedClassroomDepartmentId !== currentClassroomDepartmentId;
  const isDeletingStudent = deleteStudentMutation.isPending;
  const isDeletingTermSheet = deleteTermSheetMutation.isPending;
  const isChangingClass = changeClassMutation.isPending;

  return (
    <Card className="rounded-xl border-border shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">
              Student management
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Administrative actions for the selected student and term sheet.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Changes affect live records</span>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border border-border p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Change student class
                </p>
                <p className="text-xs text-muted-foreground">
                  Current: {fullClassName(term)}
                </p>
              </div>
              <MoveRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Select
                value={selectedClassroomDepartmentId}
                onValueChange={setSelectedClassroomDepartmentId}
                disabled={!hasTermSheet || isLoadingClassrooms}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {(classrooms?.data ?? []).map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                disabled={!hasClassChange || isChangingClass}
                onClick={() => {
                  if (!term?.studentTermId || !selectedClassroomDepartmentId) {
                    return;
                  }
                  changeClassMutation.mutate({
                    studentTermFormId: term.studentTermId,
                    classroomDepartmentId: selectedClassroomDepartmentId,
                  });
                }}
              >
                {isChangingClass ? (
                  <span className="mr-2">
                    <Spinner />
                  </span>
                ) : null}
                Change class
              </Button>
            </div>
            {!hasTermSheet ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Select an enrolled term before changing class.
              </p>
            ) : null}
          </div>

          <div className="grid gap-2 rounded-lg border border-destructive/20 p-3">
            <p className="text-sm font-medium text-foreground">Delete records</p>
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={!hasTermSheet || isDeletingTermSheet}
              onClick={() => {
                if (!term?.studentTermId) return;
                if (
                  !window.confirm(
                    "Delete this student's selected term sheet? This will remove the student from the selected term.",
                  )
                ) {
                  return;
                }
                deleteTermSheetMutation.mutate({ id: term.studentTermId });
              }}
            >
              {isDeletingTermSheet ? (
                <Spinner />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete current term sheet
            </Button>
            <Button
              type="button"
              variant="outline"
              className="justify-start gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isDeletingStudent}
              onClick={() => {
                if (
                  !window.confirm(
                    "Delete this student and their active academic records?",
                  )
                ) {
                  return;
                }
                deleteStudentMutation.mutate({ studentId });
              }}
            >
              {isDeletingStudent ? (
                <Spinner />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete student
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
