import { StudentOverviewSectionsSkeleton } from "./student-overview.loading";
import { Suspense, useEffect, useState } from "react";
import { OverviewDetails, OverviewSection } from "./overview-section";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@school-clerk/ui/alert-dialog";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@school-clerk/ui/item";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@school-clerk/ui/field";
import { Check } from "lucide-react";
import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { cn } from "@school-clerk/ui/cn";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { Spinner } from "@school-clerk/ui/spinner";
import { useStudentParams } from "@/hooks/use-student-params";
import { StudentDuplicateAlert } from "./student-duplicate-alert";
import { StudentEnrollmentStatus } from "./student-enrollment-status";
import { useDeleteStudent } from "@/hooks/use-delete-student";
import { useRemoveStudentTerms } from "@/hooks/use-remove-student-terms";
import { useMoveStudentTerms } from "@/hooks/use-move-student-terms";
import { toast } from "@school-clerk/ui/use-toast";
import { useRouter } from "next/navigation";

function fullClassName(term?: {
  classDisplayName?: string | null;
  departmentName?: string | null;
}) {
  return term?.classDisplayName || term?.departmentName || "Not assigned";
}

function canManageStudents(role?: string | null) {
  return role === "ADMIN" || role === "Admin" || role === "Registrar";
}

export function StudentOverview() {
  return (
    <Suspense fallback={<StudentOverviewSectionsSkeleton />}>
      <Content />
    </Suspense>
  );
}

function Content() {
  const { overviewData, activeStudentTerm, selectTerm } =
    useStudentOverviewSheet();
  const auth = useAuth();
  const canManage = canManageStudents(auth.role);
  const student = overviewData?.student;
  const currentTerm = activeStudentTerm;
  const terms = overviewData?.studentTerms ?? [];

  const details = [
    { label: "Student ID", value: student?.id ? student.id.slice(0, 8) : "—", mono: true },
    { label: "Class", value: fullClassName(currentTerm) },
    { label: "Term", value: currentTerm?.term || "—" },
    { label: "Gender", value: student?.gender || "—" },
  ];

  return (
    <div className="divide-y divide-border">
      <OverviewDetails details={details} />

      <div className="py-5 empty:hidden">
        <StudentDuplicateAlert
          classroomDepartmentId={currentTerm?.departmentId}
          sessionTermId={currentTerm?.termId}
          studentId={student?.id}
          compact
        />
      </div>

      {canManage && student?.id ? <StudentEnrollmentStatus studentId={student.id} /> : null}

      {terms.length > 0 ? (
        <OverviewSection
          title="Term history"
          description="Select a term to view its class, results, attendance and payments."
        >
          <ItemGroup className="-mx-2">
            {terms.map((term, index) => {
              const isActive = currentTerm?.termId === term.termId;
              const state =
                term.enrollmentState === "enrolled"
                  ? "Enrolled"
                  : term.enrollmentState === "not-enrolled"
                    ? "Not enrolled"
                    : "Needs review";
              return (
                <div key={term.termId}>
                  {index > 0 ? <ItemSeparator /> : null}
                  <Item
                    asChild
                    size="sm"
                    className={cn(
                      "w-full cursor-pointer hover:bg-muted/50",
                      isActive && "bg-muted/70 hover:bg-muted/70",
                    )}
                  >
                    <button
                      type="button"
                      aria-current={isActive ? "true" : undefined}
                      onClick={() => selectTerm(term.termId, term.studentTermId || null)}
                    >
                      <ItemContent className="min-w-0 text-left">
                        <ItemTitle className="flex items-center gap-2">
                          {term.term}
                          {isActive ? <Check className="h-3.5 w-3.5 text-primary" aria-hidden /> : null}
                        </ItemTitle>
                        <ItemDescription>
                          {term.studentTermId ? <bdi>{fullClassName(term)}</bdi> : "No class for this term"}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Badge
                          variant={
                            term.enrollmentState === "enrolled"
                              ? "secondary"
                              : term.enrollmentState === "not-enrolled"
                                ? "outline"
                                : "warning"
                          }
                        >
                          {state}
                        </Badge>
                      </ItemActions>
                    </button>
                  </Item>
                </div>
              );
            })}
          </ItemGroup>
        </OverviewSection>
      ) : null}

      {canManage ? <StudentManagementSections /> : null}
    </div>
  );
}

type PendingConfirm = "move" | "remove-term" | "delete" | null;

const CONFIRM_COPY: Record<
  Exclude<PendingConfirm, null>,
  { title: string; description: string; action: string; destructive?: boolean }
> = {
  move: {
    title: "Move to the selected class?",
    description:
      "This term's placement and its session default move to the new class. Other terms stay as they are. Scores, attendance and fees are not remapped or recalculated.",
    action: "Move student",
  },
  "remove-term": {
    title: "Remove this term enrollment?",
    description:
      "The student leaves this term's roster. Results, attendance and payment history are kept, and outstanding balances are not cancelled.",
    action: "Remove enrollment",
    destructive: true,
  },
  delete: {
    title: "Delete this student?",
    description:
      "The student and their active academic records are archived. Results, guardians and payment history are kept, and outstanding balances are not cancelled. To record that a student left the school, withdraw them instead.",
    action: "Delete student",
    destructive: true,
  },
};

function StudentManagementSections() {
  const svc = useStudentOverviewSheet();
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setParams } = useStudentParams();
  const studentId = svc.overviewData?.student?.id;
  const term = svc.activeStudentTerm;
  const currentClassroomDepartmentId = term?.departmentId ?? "";
  const [selectedClassroomDepartmentId, setSelectedClassroomDepartmentId] =
    useState(currentClassroomDepartmentId);
  const [confirm, setConfirm] = useState<PendingConfirm>(null);

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

  const deleteStudentMutation = useDeleteStudent(studentId, () => {
    if (svc.isSheetMode) setParams(null);
    else router.push("/students/list");
  });

  const deleteTermSheetMutation = useRemoveStudentTerms({
    contextKey: JSON.stringify([studentId, term?.termId, term?.studentTermId]),
    onSuccess() {
      if (term?.termId) svc.selectTerm(term.termId, null);
      invalidateStudentData();
    },
  });

  const changeClassMutation = useMoveStudentTerms({
    studentTermFormIds:
      term?.enrollmentState === "enrolled" && term.studentTermId ? [term.studentTermId] : [],
    classroomDepartmentId: selectedClassroomDepartmentId,
    contextKey: JSON.stringify([studentId, term?.termId, term?.termSessionId]),
    onSuccess(result) {
      toast({
        title: result.count ? "Class placement updated" : "Already in class",
        description: `${result.count} moved; ${result.alreadyInClass} already in the selected class.`,
      });
      invalidateStudentData();
    },
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: clear the pick whenever the term or placement changes.
  useEffect(() => {
    setSelectedClassroomDepartmentId("");
  }, [changeClassMutation.selectionKey, currentClassroomDepartmentId]);

  if (!studentId) return null;

  const hasTermSheet = term?.enrollmentState === "enrolled" && Boolean(term.studentTermId);
  const hasClassChange =
    hasTermSheet &&
    selectedClassroomDepartmentId &&
    selectedClassroomDepartmentId !== currentClassroomDepartmentId;
  const isDeletingStudent = deleteStudentMutation.isPending;
  const isDeletingTermSheet = deleteTermSheetMutation.isPending;
  const isChangingClass = changeClassMutation.isPending;
  const isChangingRecords = isDeletingStudent || isDeletingTermSheet || isChangingClass;

  const runConfirmed = () => {
    if (confirm === "move") {
      if (hasClassChange && changeClassMutation.ready) changeClassMutation.submit();
    } else if (confirm === "remove-term") {
      if (
        deleteTermSheetMutation.ready &&
        term?.enrollmentState === "enrolled" &&
        term.studentTermId
      ) {
        deleteTermSheetMutation.mutate({ id: term.studentTermId });
      }
    } else if (confirm === "delete") {
      if (deleteStudentMutation.ready) void deleteStudentMutation.submit();
    }
    setConfirm(null);
  };
  const copy = confirm ? CONFIRM_COPY[confirm] : null;
  const destructiveOutline =
    "min-h-11 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive";

  return (
    <>
      <OverviewSection
        title="Class placement"
        description={
          <>
            In <bdi className="font-medium text-foreground">{fullClassName(term)}</bdi> for{" "}
            {term?.term ?? "the selected term"}.
          </>
        }
      >
        <Field>
          <FieldLabel htmlFor="student-destination-class" className="sr-only">
            Destination class
          </FieldLabel>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={selectedClassroomDepartmentId}
              onValueChange={setSelectedClassroomDepartmentId}
              disabled={!hasTermSheet || !changeClassMutation.data || isChangingRecords}
            >
              <SelectTrigger id="student-destination-class" className="min-h-11 sm:max-w-xs">
                <SelectValue
                  placeholder={
                    changeClassMutation.optionsLoading ? "Loading classes…" : "Choose a class"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(changeClassMutation.data?.classrooms ?? []).map((classroom) => (
                  <SelectItem
                    className="min-h-11 whitespace-normal"
                    key={classroom.id}
                    value={classroom.id}
                  >
                    {classroom.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={!hasClassChange || !changeClassMutation.ready || isChangingRecords}
              onClick={() => setConfirm("move")}
            >
              {isChangingClass ? <Spinner /> : null}
              Move student
            </Button>
          </div>
          <FieldDescription>
            {hasTermSheet
              ? "Only this term and its session default change. Scores, attendance and fees keep their original class links."
              : "Select an enrolled term to change its class."}
          </FieldDescription>
          {hasTermSheet && changeClassMutation.data?.classrooms.length === 0 ? (
            <FieldDescription>No other classes are available in this session.</FieldDescription>
          ) : null}
          {hasTermSheet && changeClassMutation.optionsError ? (
            <FieldError>
              {changeClassMutation.optionsError}{" "}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                disabled={!changeClassMutation.canRefresh || isChangingRecords}
                onClick={changeClassMutation.refresh}
              >
                Try again
              </Button>
            </FieldError>
          ) : null}
          {changeClassMutation.error ? (
            <FieldError>
              {changeClassMutation.error} Refresh to check the placement before retrying.
            </FieldError>
          ) : null}
        </Field>
      </OverviewSection>

      <OverviewSection
        title="Danger zone"
        description="These actions change live records. History and balances are always kept."
      >
        <ItemGroup className="rounded-lg border border-destructive/30">
          <Item size="sm">
            <ItemContent>
              <ItemTitle>Remove term enrollment</ItemTitle>
              <ItemDescription className="line-clamp-none">
                Take the student off {term?.term ?? "the selected term"} only.
              </ItemDescription>
              {deleteTermSheetMutation.error ? (
                <p role="alert" className="text-sm text-destructive">
                  {deleteTermSheetMutation.error.message}
                </p>
              ) : null}
            </ItemContent>
            <ItemActions>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={destructiveOutline}
                disabled={!hasTermSheet || isChangingRecords || !deleteTermSheetMutation.ready}
                onClick={() => setConfirm("remove-term")}
              >
                {isDeletingTermSheet ? <Spinner /> : null}
                Remove
              </Button>
            </ItemActions>
          </Item>
          <ItemSeparator className="bg-destructive/20" />
          <Item size="sm">
            <ItemContent>
              <ItemTitle>Delete student</ItemTitle>
              <ItemDescription className="line-clamp-none">
                Archive the student everywhere. Withdraw them instead if they left the school.
              </ItemDescription>
              {deleteStudentMutation.error ? (
                <p role="alert" className="text-sm text-destructive">
                  {deleteStudentMutation.error} Refresh the directory if the response was
                  interrupted.
                </p>
              ) : null}
            </ItemContent>
            <ItemActions>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={destructiveOutline}
                disabled={isChangingRecords || !deleteStudentMutation.ready}
                onClick={() => setConfirm("delete")}
              >
                {isDeletingStudent ? <Spinner /> : null}
                Delete
              </Button>
            </ItemActions>
          </Item>
        </ItemGroup>
      </OverviewSection>

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "min-h-11",
                copy?.destructive &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
              onClick={runConfirmed}
            >
              {copy?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
