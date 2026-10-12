import Sheet from "@school-clerk/ui/custom/sheet";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useSubjectParams } from "@/hooks/use-subject-params";
import { useAuth } from "@/hooks/use-auth";
import { ClassroomStudents } from "../classroom-students";
import { ClassroomSubject } from "../classroom-subjects";
import { ErrorFallback } from "../error-fallback";
import { FormContext } from "../students/form-context";
import { Form } from "../forms/student-form";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { Suspense } from "react";
import { ClassroomSubjectSecondaryForm } from "../classroom-subject-secondary-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { StudentFormAction } from "../forms/student-form-action";
import { ClassroomSubjectOverviewSecondary } from "../classroom-subject-secondary-overview";
import { ClassroomAttendance } from "../classroom-attendance";
import { ClassroomAttendanceForm } from "../classroom-attendance-form";
import { FileText } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMemo } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@school-clerk/ui/select";
import { ClassroomSelectTrigger } from "../classroom-select-trigger";
import { AttendanceDraftProvider } from "../attendance-draft-context";
import {
  ClassroomSectionBar,
  ClassroomSectionHeader,
  ClassroomSectionRail,
  classroomSections,
  resolveClassroomSection,
  type ClassroomSection,
} from "../classroom-overview/classroom-section-nav";
import { ClassroomPayments } from "../classroom-overview/classroom-payments";
import { useClassroomMetrics } from "../classroom-overview/use-classroom-metrics";

export function ClassroomOverviewSheet({}) {
  const { setParams, ...params } = useClassroomParams();
  const { viewClassroomId } = params;
  const isOpen = Boolean(params.viewClassroomId);
  const auth = useAuth();
  const attendanceDraftKey = JSON.stringify([
    auth.id,
    auth.sessionId,
    auth.profile?.schoolId,
    auth.profile?.sessionId,
    auth.profile?.termId,
    viewClassroomId,
  ]);
  const section = resolveClassroomSection(params.classroomTab);
  const sectionLabel = classroomSections.find(
    (item) => item.value === section,
  )?.label;
  return (
    <AttendanceDraftProvider
      key={attendanceDraftKey}
      departmentId={viewClassroomId}
    >
      {/* Section rail layout: details replace the section page in place, so the
          sheet keeps one width (ADR-0078). */}
      <Sheet
        primarySize="4xl"
        secondaryLayout="replace"
        secondaryBackLabel={sectionLabel}
        hideClose
        open={isOpen}
        onOpenChange={() => setParams(null)}
        onCloseSecondary={() => setParams({ secondaryTab: null })}
        sheetName="classroom-overview"
        secondaryOpened={!!params.secondaryTab}
      >
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<LoadingSkeleton />}>
            <Content />
          </Suspense>
        </ErrorBoundary>
      </Sheet>
    </AttendanceDraftProvider>
  );
}

export function Content({}) {
  const { setParams, ...params } = useClassroomParams();
  const { setParams: setSubjectParams } = useSubjectParams();
  const { viewClassroomId } = params;
  const isOpen = !!params.viewClassroomId;
  const trpc = useTRPC();
  const { data: classRoom } = useSuspenseQuery(
    trpc.classrooms.getClassroomOverview.queryOptions(
      {
        departmentId: params.viewClassroomId || "-",
      },
      {
        enabled: isOpen,
      },
    ),
  );
  const { data: classroomOptionsData } = useSuspenseQuery(
    trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
  );
  const session = classRoom?.classRoom?.session;
  const metrics = useClassroomMetrics({
    departmentId: viewClassroomId,
    sessionId: session?.id,
    termId: session?.term?.id,
    studentCount: classRoom?._count?.studentSessionForms ?? 0,
  });
  if (!isOpen) return null;

  const section = resolveClassroomSection(params.classroomTab);
  const classroomOptions = classroomOptionsData?.data ?? [];
  const currentClassroom = classroomOptions.find(
    (classroom) => classroom.id === viewClassroomId,
  );
  const classTitle =
    currentClassroom?.displayName || classRoom?.classRoom?.name || "Classroom";
  const termLabel = [session?.term?.title, session?.title]
    .filter(Boolean)
    .join(" · ");

  // Leaving a detail also drops the subject workspace's own URL state.
  const clearSubjectWorkspace = () =>
    setSubjectParams({ openSubjectSecondaryId: null, subjectTab: null });
  const selectSection = (next: ClassroomSection) => {
    clearSubjectWorkspace();
    setParams({
      classroomTab: next,
      secondaryTab: null,
      attendanceSessionId: null,
      attendanceView: null,
    });
  };
  const closeSheet = () => setParams(null);

  const switcher = (
    <Select
      value={viewClassroomId ?? ""}
      onValueChange={(nextClassroomId) => {
        clearSubjectWorkspace();
        setParams({
          attendanceSessionId: null,
          attendanceView: null,
          secondaryTab: null,
          subjectOverviewId: null,
          viewClassroomId: nextClassroomId,
        });
      }}
    >
      <ClassroomSelectTrigger
        aria-label="Switch classroom"
        className="h-auto min-w-0 max-w-full gap-2 rounded-none border-0 bg-transparent p-0 text-base font-semibold tracking-tight shadow-none focus:ring-0"
      >
        <SelectValue placeholder="Select a classroom" />
      </ClassroomSelectTrigger>
      <SelectContent className="max-h-80">
        {classroomOptions.map((classroom) => (
          <SelectItem key={classroom.id} value={classroom.id}>
            <span dir="auto">{classroom.displayName}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const navProps = {
    active: section,
    metrics,
    onSelect: selectSection,
    onClose: closeSheet,
    switcher,
    termLabel,
  };

  return (
    <Sheet.MultiContent className="flex-col bg-background lg:flex-row">
      <Sheet.Title className="sr-only">{classTitle}</Sheet.Title>
      <Sheet.Description className="sr-only">
        {termLabel ? `Classroom overview for ${termLabel}` : "Classroom overview"}
      </Sheet.Description>
      <ClassroomSectionRail {...navProps} />
      <Sheet.PrimaryContent>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ClassroomSectionBar {...navProps} />
          {/* Radix wraps viewport content in a display:table box that grows to its
              widest child; keep it block so wide tables scroll inside the page. */}
          <Sheet.ScrollArea className="px-4 pt-4 lg:px-6 lg:pt-5 [&_[data-radix-scroll-area-viewport]>div]:!block">

            {section === "students" ? (
              <ClassroomStudents
                departmentId={viewClassroomId}
                sessionTermId={session?.term?.id}
                studentCount={metrics.students.count}
              />
            ) : section === "subjects" ? (
              <ClassroomSubject departmentId={viewClassroomId} />
            ) : section === "attendance" ? (
              <ClassroomAttendance
                departmentId={viewClassroomId}
                layout="workspace"
              />
            ) : section === "payments" ? (
              <ClassroomPayments
                departmentId={viewClassroomId}
                sessionId={session?.id}
                termId={session?.term?.id}
              />
            ) : (
              <PerformanceComingSoon />
            )}
          </Sheet.ScrollArea>
        </div>
      </Sheet.PrimaryContent>
      <StudentForm
        schoolSessionId={session?.id}
        sessionTermId={session?.term?.id}
      />
      <ClassroomSubjectSecondaryForm />
      <ClassroomSubjectOverviewSecondary />
      <ClassroomAttendanceForm />
    </Sheet.MultiContent>
  );
}

function PerformanceComingSoon() {
  return (
    <div className="flex flex-col gap-4">
      <ClassroomSectionHeader
        title="Performance"
        description="Class average and result trends for the current term."
      />
      <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
        <div className="rounded-full bg-muted p-2 text-muted-foreground">
          <FileText className="size-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Performance is coming soon</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Performance data for this classroom will be available once the
            feature is configured for the current term.
          </p>
        </div>
      </div>
    </div>
  );
}

function StudentForm({ schoolSessionId, sessionTermId }) {
  const ctx = useClassroomParams();
  const auth = useAuth();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const defaultValues = useMemo(() => ({
    classRoomId: ctx.viewClassroomId,
    termForms: [{ schoolSessionId, sessionTermId }],
  }), [ctx.viewClassroomId, schoolSessionId, sessionTermId]);
  const scopeKey = JSON.stringify([auth.profile?.schoolId, auth.id, auth.sessionId, auth.profile?.sessionId, auth.profile?.termId, schoolSessionId, sessionTermId, ctx.viewClassroomId]);
  const scopeReady = !auth.isPending && !auth.isProfileLoading && !auth.isProfileError &&
    !!auth.id && !!auth.sessionId && !!auth.profile?.schoolId && auth.profile.auth?.userId === auth.id;
  const refreshClassroom = () => {
    queryClient.invalidateQueries({ queryKey: trpc.attendance.getAttendanceRoster.queryKey({ departmentId: ctx.viewClassroomId || "-" }) });
    queryClient.invalidateQueries({ queryKey: trpc.classrooms.getCurrentSessionClassroom.queryKey() });
    queryClient.invalidateQueries({ queryKey: trpc.classrooms.getClassroomOverview.queryKey({ departmentId: ctx.viewClassroomId || "-" }) });
  };
  const closeForm = () => ctx.setParams({ secondaryTab: null });
  // From the attendance recorder, saving returns straight to the (preserved) register.
  const fromAttendance = ctx.classroomTab === "attendance";
  const onSaved = () => {
    refreshClassroom();
    closeForm();
  };
  if (ctx.secondaryTab != "student-form") return null;
  return (
    <>
      <Sheet.SecondaryContent>
        <Sheet.SecondaryHeader>
          <Sheet.Header className="bg-background flex-row items-start gap-4 space-y-0">
            <div className="grid gap-2">
              <Sheet.Title>
                <>New Student</>
              </Sheet.Title>
              <Sheet.Description>
                <>Add a student to this classroom</>
              </Sheet.Description>
            </div>
          </Sheet.Header>
        </Sheet.SecondaryHeader>
        <Sheet.Content>
          {scopeReady ? <FormContext key={scopeKey} defaultValues={defaultValues}>
            <Form onEnrolled={fromAttendance ? onSaved : undefined} />
            <Sheet.SecondaryFooter>
              <StudentFormAction
                onCreated={refreshClassroom}
                onSaved={fromAttendance ? onSaved : undefined}
                onClose={closeForm}
              />
            </Sheet.SecondaryFooter>
          </FormContext> : <p role="status">Loading your registration workspace…</p>}
        </Sheet.Content>
      </Sheet.SecondaryContent>
    </>
  );
}
function LoadingSkeleton() {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <Sheet.Title className="sr-only">Loading classroom</Sheet.Title>
      <div className="hidden w-56 shrink-0 flex-col gap-3 border-r border-border bg-muted/40 p-4 lg:flex">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-24" />
        <div className="mt-4 flex flex-col gap-4">
          {classroomSections.map((item) => (
            <div key={item.value} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
