import Sheet from "@school-clerk/ui/custom/sheet";
import {
  Tabs as TabsBase,
  TabsContent,
} from "@school-clerk/ui/tabs";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { ClassroomStudents } from "../classroom-students";
import { ClassroomSubject } from "../classroom-subjects";
import { FormContext } from "../students/form-context";
import { Form } from "../forms/student-form";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { Suspense } from "react";
import { ClassroomSubjectSecondaryForm } from "../classroom-subject-secondary-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { StudentFormAction } from "../forms/student-form-action";
import { ClassroomSubjectOverviewSecondary } from "../classroom-subject-secondary-overview";
import { _trpc } from "../static-trpc";
import { ClassroomAttendance } from "../classroom-attendance";
import { ClassroomAttendanceForm } from "../classroom-attendance-form";
import { Badge } from "@school-clerk/ui/badge";
import {
  Users,
  Calendar,
  BookOpen,
  Banknote,
  BarChart3,
  FileText,
} from "lucide-react";
import { cn } from "@school-clerk/ui/cn";

export function ClassroomOverviewSheet({}) {
  const { setParams, ...params } = useClassroomParams();
  const { viewClassroomId } = params;
  const isOpen = Boolean(params.viewClassroomId);
  return (
    <Sheet
      primarySize="xl"
      secondarySize="5xl"
      open={isOpen}
      onOpenChange={() => setParams(null)}
      onCloseSecondary={() => setParams({ secondaryTab: null })}
      sheetName="student-overview"
      secondaryOpened={!!params.secondaryTab}
    >
      <Suspense fallback={<LoadingSkeleton />}>
        <Content />
      </Suspense>
    </Sheet>
  );
}

const tabItems = [
  { value: "students", label: "Students", icon: Users },
  { value: "attendance", label: "Attendance", icon: Calendar },
  { value: "subjects", label: "Subjects", icon: BookOpen },
  { value: "payments", label: "Payments", icon: Banknote },
  { value: "performance", label: "Performance", icon: BarChart3 },
] as const;

export function Content({}) {
  const { setParams, ...params } = useClassroomParams();
  const { viewClassroomId } = params;
  const isOpen = !!params.viewClassroomId;
  const { data: classRoom } = useSuspenseQuery(
    _trpc.classrooms.getClassroomOverview.queryOptions(
      {
        departmentId: params.viewClassroomId || "-",
      },
      {
        enabled: isOpen,
      },
    ),
  );
  if (!isOpen) return null;

  const studentCount = classRoom?._count?.studentSessionForms ?? 0;
  const sessionTitle = classRoom?.classRoom?.session?.title;

  return (
    <>
      <Sheet.MultiContent className="bg-background">
        {/* Header Section */}
        <Sheet.Header className="bg-card border-b border-border pb-4">
          <Sheet.Title>
            <Sheet.PrimaryContent>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold tracking-tight">
                  {classRoom?.displayName}
                </span>
                {sessionTitle && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                  >
                    {sessionTitle}
                  </Badge>
                )}
              </div>
            </Sheet.PrimaryContent>
          </Sheet.Title>
          <Sheet.Description asChild>
            <Sheet.PrimaryContent>
              <div className="flex flex-col gap-4 mt-2">
                <p className="text-muted-foreground text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Class: {classRoom?.classRoom?.name}
                </p>
                {/* Stats Row */}
                <div className="flex gap-6">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Students
                    </span>
                    <span className="text-xl font-bold text-foreground">
                      {studentCount}
                    </span>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Attendance
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        --
                      </span>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-border" />
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Class Avg
                    </span>
                    <span className="text-xl font-bold text-foreground">
                      --
                    </span>
                  </div>
                </div>
              </div>
            </Sheet.PrimaryContent>
          </Sheet.Description>
        </Sheet.Header>
        <Sheet.PrimaryContent>
          {/* Tab Navigation */}
          <nav className="border-b border-border px-2">
            <div className="flex gap-4 overflow-x-auto no-scrollbar">
              {tabItems.map((tab) => {
                const isActive = params?.classroomTab === tab.value;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.value}
                    onClick={() =>
                      setParams({ classroomTab: tab.value as any })
                    }
                    className={cn(
                      "flex items-center gap-2 border-b-2 py-3 text-sm font-medium transition-all whitespace-nowrap",
                      isActive
                        ? "border-primary text-primary font-semibold"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>
          <Sheet.ScrollArea className="flex flex-col gap-2">
            <TabsBase value={params?.classroomTab}>
              <TabsContent value="students" className="h-screen">
                <ClassroomStudents departmentId={viewClassroomId} />
              </TabsContent>
              <TabsContent value="subjects" className="h-screen">
                <ClassroomSubject departmentId={viewClassroomId} />
              </TabsContent>
              <TabsContent value="attendance" className="h-screen">
                <ClassroomAttendance departmentId={viewClassroomId} />
              </TabsContent>
              <TabsContent value="payments" className="h-screen">
                <ComingSoonPlaceholder tab="Payments" />
              </TabsContent>
              <TabsContent value="performance" className="h-screen">
                <ComingSoonPlaceholder tab="Performance" />
              </TabsContent>
            </TabsBase>
          </Sheet.ScrollArea>
        </Sheet.PrimaryContent>
        <StudentForm
          schoolSessionId={classRoom?.classRoom?.session?.id}
          sessionTermId={classRoom?.classRoom?.session?.term?.id}
        />
        <ClassroomSubjectSecondaryForm />
        <ClassroomSubjectOverviewSecondary />
        <ClassroomAttendanceForm />
      </Sheet.MultiContent>
    </>
  );
}

function ComingSoonPlaceholder({ tab }: { tab: string }) {
  return (
    <div className="mt-8 mb-4 animate-in fade-in">
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/10 p-4 border border-blue-100 dark:border-blue-900/30 flex gap-4 items-start">
        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-300">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
            {tab} Coming Soon
          </h4>
          <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
            {tab} data for this classroom will be available once the feature is
            configured for the current term.
          </p>
        </div>
      </div>
    </div>
  );
}

function StudentForm({ schoolSessionId, sessionTermId }) {
  const ctx = useClassroomParams();
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
          <FormContext
            defaultValues={{
              classRoomId: ctx?.viewClassroomId,
              termForms: [
                {
                  schoolSessionId,
                  sessionTermId,
                },
              ],
            }}
          >
            <Form />
            <Sheet.SecondaryFooter>
              <StudentFormAction />
            </Sheet.SecondaryFooter>
          </FormContext>
        </Sheet.Content>
      </Sheet.SecondaryContent>
    </>
  );
}
function LoadingSkeleton() {
  return (
    <>
      <Sheet.Header>
        <Sheet.Title>
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </Sheet.Title>
        <Sheet.Description asChild>
          <div className="flex flex-col gap-4 mt-2">
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-6">
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-20" />
              <Skeleton className="h-12 w-20" />
            </div>
          </div>
        </Sheet.Description>
      </Sheet.Header>
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-6 gap-4 p-4">
        <Skeleton className="h-36 col-span-6" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-3" />
        <Skeleton className="h-8 col-span-4" />
        <Skeleton className="h-8 col-span-2" />
      </div>
    </>
  );
}
