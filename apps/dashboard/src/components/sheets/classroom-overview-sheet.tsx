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
import { Button } from "@school-clerk/ui/button";
import {
  Users,
  Calendar,
  BookOpen,
  Banknote,
  BarChart3,
  FileText,
  Receipt,
} from "lucide-react";
import { cn } from "@school-clerk/ui/cn";
import { AnimatedNumber } from "../animated-number";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function ClassroomOverviewSheet({}) {
  const { setParams, ...params } = useClassroomParams();
  const { viewClassroomId } = params;
  const isOpen = Boolean(params.viewClassroomId);
  return (
    <Sheet
      primarySize="3xl"
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
                <ClassroomPayments
                  departmentId={viewClassroomId}
                  sessionId={classRoom?.classRoom?.session?.id}
                  termId={classRoom?.classRoom?.session?.term?.id}
                />
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

type ClassroomPaymentCharge = {
  id: string;
  title: string;
  amount: number;
  amountPaid: number;
  outstanding: number;
  status: string;
  collectionStatus?: string | null;
  studentName?: string | null;
  student?: { id: string; name?: string | null; surname?: string | null; otherName?: string | null } | null;
  stream?: { name?: string | null } | null;
};

function ClassroomPayments({
  departmentId,
  sessionId,
  termId,
}: {
  departmentId?: string | null;
  sessionId?: string | null;
  termId?: string | null;
}) {
  const trpc = useTRPC();
  const { setParams: setPaymentParams } = useReceivePaymentParams();
  const { data = [], isLoading } = useQuery(
    trpc.finance.getCharges.queryOptions(
      {
        classroomDepartmentId: departmentId || null,
        sessionId: sessionId || null,
        termId: termId || null,
        payerType: "STUDENT",
      },
      { enabled: Boolean(departmentId) },
    ),
  );
  const charges = data as ClassroomPaymentCharge[];
  const totals = useMemo(() => {
    return charges.reduce(
      (summary, charge) => {
        summary.billed += Number(charge.amount || 0);
        summary.paid += Number(charge.amountPaid || 0);
        summary.outstanding += Math.max(Number(charge.outstanding || 0), 0);
        if (Number(charge.outstanding || 0) <= 0) summary.paidCharges += 1;
        if (Number(charge.outstanding || 0) > 0) summary.openCharges += 1;
        return summary;
      },
      { billed: 0, paid: 0, outstanding: 0, paidCharges: 0, openCharges: 0 },
    );
  }, [charges]);
  const collectionRate =
    totals.billed > 0 ? Math.round((totals.paid / totals.billed) * 100) : 0;
  const sortedCharges = useMemo(
    () =>
      [...charges].sort(
        (a, b) => Number(b.outstanding || 0) - Number(a.outstanding || 0),
      ),
    [charges],
  );

  const openPaymentSheet = (charge?: ClassroomPaymentCharge) => {
    setPaymentParams({
      receivePayment: true,
      receivePaymentStudentId: charge?.student?.id ?? null,
      receivePaymentStudentName: charge?.student?.id
        ? null
        : charge?.studentName ?? null,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 animate-in fade-in">
      <div className="grid grid-cols-2 gap-3">
        <PaymentStat label="Billed" value={totals.billed} />
        <PaymentStat label="Received" value={totals.paid} tone="success" />
        <PaymentStat label="Outstanding" value={totals.outstanding} tone="warning" />
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Collection
          </p>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-2xl font-semibold">{collectionRate}%</span>
            <span className="pb-1 text-xs text-muted-foreground">
              {totals.paidCharges}/{charges.length} paid
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Student charges</h3>
          <p className="text-xs text-muted-foreground">
            {totals.openCharges} outstanding, {totals.paidCharges} settled
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => openPaymentSheet()}>
          <Banknote className="h-4 w-4" />
          Receive payment
        </Button>
      </div>

      {sortedCharges.length ? (
        <div className="divide-y rounded-lg border bg-card">
          {sortedCharges.map((charge) => {
            const isPaid = Number(charge.outstanding || 0) <= 0;
            return (
              <div
                key={charge.id}
                className="flex items-center gap-3 p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Receipt className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {charge.studentName || "Student"}
                    </p>
                    <PaymentStatusBadge
                      status={isPaid ? "PAID" : charge.collectionStatus || charge.status}
                    />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {[charge.title, charge.stream?.name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isPaid ? "text-emerald-600" : "text-orange-600",
                    )}
                  >
                    <AnimatedNumber
                      value={isPaid ? charge.amountPaid : charge.outstanding}
                      currency="NGN"
                      maximumFractionDigits={0}
                    />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    paid{" "}
                    <AnimatedNumber
                      value={charge.amountPaid}
                      currency="NGN"
                      maximumFractionDigits={0}
                    />
                  </p>
                </div>
                {!isPaid ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPaymentSheet(charge)}
                  >
                    Record
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 text-center">
          <Receipt className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 text-sm font-semibold">No student charges</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Payments recorded for this classroom will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

function PaymentStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-xl font-semibold",
          tone === "success" && "text-emerald-600",
          tone === "warning" && "text-orange-600",
        )}
      >
        <AnimatedNumber
          value={value}
          currency="NGN"
          maximumFractionDigits={0}
        />
      </p>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status?: string | null }) {
  const normalized = (status || "PENDING").replace(/_/g, " ").toLowerCase();
  const isPaid = status === "PAID" || status === "COLLECTED";
  return (
    <Badge
      variant={isPaid ? "success" : "outline"}
      className={cn(
        "h-5 rounded-none px-1.5 text-[10px]",
        !isPaid && "border-orange-300 text-orange-700",
      )}
    >
      {isPaid ? "paid" : normalized}
    </Badge>
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
