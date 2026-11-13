import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Suspense } from "react";

import { useDebugToast } from "@/hooks/use-debug-console";
import { useStudentFeePreview } from "@/hooks/use-student-fee-preview";
import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { useZodForm } from "@/hooks/use-zod-form";
import { entrollStudentToTermSchema } from "@school-clerk/assessment-results";
import { Alert, AlertDescription } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { FormCombobox } from "@school-clerk/ui/controls/form-combobox";
import { Form } from "@school-clerk/ui/form";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@school-clerk/ui/item";
import { selectOptions } from "@school-clerk/utils";
import { ArrowRight } from "lucide-react";
import { formatNaira } from "../finance/student-payment-allocation";
import { SubmitButton } from "../submit-button";
import { OverviewDetails, OverviewSection } from "./overview-section";
import { StudentHistoryUnavailable } from "./student-history-unavailable";
import { StudentAcademicsSkeleton } from "./student-overview.loading";

function fullClassName(term?: {
  classDisplayName?: string | null;
  departmentName?: string | null;
}) {
  return term?.classDisplayName || term?.departmentName || "—";
}

export function StudentAcademicsOverview() {
  return (
    <Suspense fallback={<StudentAcademicsSkeleton />}>
      <Content />
    </Suspense>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <p className="break-words py-6 text-sm text-muted-foreground">{children}</p>;
}

function Content() {
  const svc = useStudentOverviewSheet();
  if (!svc?.overviewData?.student?.id) return null;

  const term = svc.activeStudentTerm;
  if (!term) {
    return <Notice>No academic term is selected. Ask an administrator to review the school terms.</Notice>;
  }
  if (term.enrollmentState === "unavailable") return <StudentHistoryUnavailable onRefresh={svc.refresh} />;
  if (term.enrollmentState === "not-enrolled") {
    if (!svc.overviewData.capabilities.enroll) {
      return (
        <Notice>
          Enrollment needs Finance access because it applies term fees. Ask an administrator to review
          module access.
        </Notice>
      );
    }
    return <NotEnrolled key={`${svc.studentId}:${term.termId}`} />;
  }
  if (term.enrollmentState !== "enrolled" || !term.studentTermId) {
    return <StudentHistoryUnavailable onRefresh={svc.refresh} />;
  }

  return (
    <div className="divide-y divide-border">
      <OverviewDetails
        details={[
          { label: "Status", value: "Enrolled", className: "text-status-success-fg" },
          { label: "Class", value: fullClassName(term) },
          { label: "Term", value: term.term || "—" },
          { label: "Session record", value: term.studentSessionId ? "Linked" : "Pending" },
        ]}
      />
      <OverviewSection
        title="This term"
        description="Results, attendance and payments follow the term picked in the header."
      >
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => svc.setActiveTab("attendance")}>
            Attendance
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => svc.setActiveTab("finance")}>
            Payments
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        </div>
      </OverviewSection>
    </div>
  );
}

function NotEnrolled() {
  const svc = useStudentOverviewSheet();
  const term = svc?.activeStudentTerm;
  const trpc = useTRPC();
  const form = useZodForm(entrollStudentToTermSchema, {
    defaultValues: {
      studentId: svc.studentId || svc.overviewData?.student?.id,
      schoolSessionId: term?.termSessionId,
      sessionTermId: term?.termId,
      classroomDepartmentId: term?.departmentId ?? undefined,
      studentSessionFormId: term?.studentSessionId,
    },
  });

  const { mutate, data: enrolledData, error, isPending } = useMutation(
    trpc.academics.entrollStudentToTerm.mutationOptions({
      retry: false,
      onSuccess() {
        svc.refresh();
      },
      meta: {
        toastTitle: {
          loading: "Enrolling...",
          success: "Enrollment confirmed",
          error: "Unable to complete!",
        },
      },
    }),
  );
  useDebugToast("Enrollment Form", enrolledData, error);

  const { data: classrooms } = useQuery(
    trpc.classrooms.getClassroomsForSession.queryOptions(term?.termSessionId, {
      enabled: !!term?.termSessionId,
    }),
  );
  const selectedClassroomDepartmentId = form.watch("classroomDepartmentId");
  const {
    data: fees,
    isLoading: isLoadingFees,
    isError: isFeesError,
    retry: retryFees,
  } = useStudentFeePreview({
    sessionTermId: term?.termId || "",
    classroomDepartmentId: selectedClassroomDepartmentId || null,
    admissionType: "RETURNING",
    studentGender: svc.overviewData?.student?.gender,
  });

  const feesReady = Boolean(selectedClassroomDepartmentId && !isLoadingFees && !isFeesError && fees);

  const onSubmit = (formData: typeof entrollStudentToTermSchema._type) => {
    if (
      isPending ||
      !feesReady ||
      !svc.overviewData?.capabilities.enroll ||
      term?.enrollmentState !== "not-enrolled" ||
      formData.studentId !== svc.overviewData.student.id ||
      formData.sessionTermId !== term.termId ||
      formData.schoolSessionId !== term.termSessionId
    )
      return;
    mutate(formData);
  };

  return (
    <OverviewSection
      title={`Not enrolled in ${term?.term || "this term"}`}
      description="Choose a class to enroll them. Required fees are charged on enrollment."
    >
      <Form {...form}>
        <form className="grid max-w-lg gap-5" onSubmit={form.handleSubmit(onSubmit)}>
          <FormCombobox
            control={form.control}
            label="Class"
            name="classroomDepartmentId"
            comboProps={{
              items: [...selectOptions(classrooms?.data || [], "displayName", "id")],
              renderSelectedItem: (item) => <bdi>{item.label as string}</bdi>,
              renderListItem: (item) => <bdi>{item.item?.label as string}</bdi>,
            }}
          />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Fees for this class</p>
            {!selectedClassroomDepartmentId ? (
              <p className="text-sm text-muted-foreground">Pick a class to preview its fees.</p>
            ) : isLoadingFees ? (
              <output className="block text-sm text-muted-foreground">Loading fees…</output>
            ) : isFeesError || !fees ? (
              <Alert variant="destructive">
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                  Fee preview is unavailable.
                  <Button type="button" variant="outline" size="sm" onClick={retryFees}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : fees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No term fees apply to this class.</p>
            ) : (
              <ItemGroup className="rounded-lg border border-border">
                {fees.map((fee, index) => (
                  <div key={fee.feeHistoryId}>
                    {index > 0 ? <ItemSeparator /> : null}
                    <Item size="sm">
                      <ItemContent className="min-w-0">
                        <ItemTitle className="break-words">{fee.title}</ItemTitle>
                        <ItemDescription className="line-clamp-none">
                          {[fee.description, fee.streamName]
                            .filter((part) => part && part !== fee.title)
                            .join(" · ") || (fee.collectable ? "Charged on enrollment" : "Not charged by this enrollment")}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions className="flex-col items-end gap-1">
                        <span className="text-sm font-medium tabular-nums">{formatNaira(fee.amount)}</span>
                        <Badge variant={fee.collectable ? "secondary" : "outline"}>
                          {fee.collectable ? "Required" : "Optional"}
                        </Badge>
                      </ItemActions>
                    </Item>
                  </div>
                ))}
              </ItemGroup>
            )}
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                Enrollment could not be confirmed. Refresh the student before trying again; a matching
                enrollment is never charged twice.
              </AlertDescription>
            </Alert>
          ) : null}

          <div>
            <SubmitButton
              className="w-full sm:w-auto"
              disabled={term?.enrollmentState !== "not-enrolled" || !feesReady}
              isSubmitting={isPending}
            >
              Enroll student
            </SubmitButton>
          </div>
        </form>
      </Form>
    </OverviewSection>
  );
}
