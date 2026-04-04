import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import { TableSkeleton } from "../tables/skeleton";
import { Suspense } from "react";

import { useZodForm } from "@/hooks/use-zod-form";
import { entrollStudentToTermSchema } from "@api/db/queries/enrollment-query";
import { Form } from "@school-clerk/ui/form";
import { useDebugToast } from "@/hooks/use-debug-console";
import { SubmitButton } from "../submit-button";
import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { FormDebugBtn } from "../form-debug-btn";
import { FormCombobox } from "@school-clerk/ui/controls/form-combobox";
import { selectOptions } from "@school-clerk/utils";
import { Card, CardContent } from "@school-clerk/ui/card";
import { Badge } from "@school-clerk/ui/badge";
import { GraduationCap, Layers3, Info } from "lucide-react";

export function StudentAcademicsOverview({}) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content />
    </Suspense>
  );
}
function Content({}) {
  const svc = useStudentOverviewSheet();
  if (!svc?.overviewData?.student?.id) return null;

  if (!svc.activeStudentTerm?.studentTermId) return <NotEntrolled />;
  const term = svc.activeStudentTerm;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Enrollment Status
                </p>
                <p className="text-sm font-semibold text-foreground">
                  Active for selected term
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-primary/20 bg-primary/10 text-primary"
            >
              Enrolled
            </Badge>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Layers3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Current Class
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {term?.departmentName || "--"}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {term?.term || "No active term selected"}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Session Link
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {term?.studentSessionId ? "Connected" : "Pending"}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Academic records, billing, and attendance will follow this term
              selection.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border-border shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-base font-semibold text-foreground">
            Academic Summary
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            This student is enrolled for the selected term. Use the term picker
            in the header to review other enrollment periods, or move to the
            attendance and payments tabs for operational details tied to this
            selection.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
function NotEntrolled() {
  const svc = useStudentOverviewSheet();
  const term = svc?.activeStudentTerm;
  const form = useZodForm(entrollStudentToTermSchema, {
    defaultValues: {
      studentId: svc.studentId || svc.overviewData?.student?.id!,
      schoolSessionId: term?.termSessionId,
      sessionTermId: term?.termId,
      // termId: term?.termId,

      classroomDepartmentId: term?.departmentId,
      // classroomId: term?.classroomId,
      studentSessionFormId: term?.studentSessionId,
    },
  });

  const trpc = useTRPC();
  const {
    mutate,
    data: enrolledData,
    error,
    isPending,
  } = useMutation(
    trpc.academics.entrollStudentToTerm.mutationOptions({
      onSuccess() {
        svc.refresh();
      },
      meta: {
        toastTitle: {
          loading: "Enrolling...",
          success: "Enrolled",
          error: "Unable to complete!",
        },
      },
    })
  );
  useDebugToast("Enrollment Form", enrolledData, error);
  const onSubmit = (formData: typeof entrollStudentToTermSchema._type) => {
    mutate(formData);
  };
  const { data: classrooms } = useQuery(
    trpc.classrooms.getClassroomsForSession.queryOptions(term?.termSessionId, {
      enabled: !!term?.termSessionId,
    })
  );
  const selectedClassroomDepartmentId = form.watch("classroomDepartmentId");
  const { data: applicableFeesPreview } = useQuery(
    trpc.academics.previewApplicableFeeHistories.queryOptions(
      {
        sessionTermId: term?.termId || "",
        classroomDepartmentId: selectedClassroomDepartmentId || null,
      },
      {
        enabled: Boolean(term?.termId),
      }
    )
  );

  // build nice student not enrolled for this term card, with enrollement formˆ
  return (
    <div className="min-h-[50vh] flex flex-col justify-center items-center">
      {/* {JSON.stringify(term)} */}
      <h1>Student not enrolled for this term</h1>
      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormCombobox
            control={form.control}
            label={"Fee"}
            name="classroomDepartmentId"
            comboProps={{
              onCreate(value) {},
              renderSelectedItem(item) {
                return (
                  <div className="flex items-center justify-between w-full group gap-2 flex-1">
                    <span>{item.label as any}</span>
                    {/* <span>{item.data?.description}</span> */}
                    {/* <span>
                      <AnimatedNumber
                        value={item?.data?.amount}
                        currency="NGN"
                      />
                    </span> */}
                  </div>
                );
              },
              // renderOnCreate: (name) => {
              //   return (
              //     <div className="flex items-center space-x-2">
              //       <button
              //         type="button"
              //         onClick={() => onCreate?.(name)}
              //       >{`Create "${name}"`}</button>
              //     </div>
              //   );
              // },
              items: [
                ...selectOptions(classrooms?.data || [], "displayName", "id"),
              ],
              renderListItem(item) {
                return (
                  <div className="flex flex-col w-full">
                    <div className="flex items-center justify-between w-full group gap-2 flex-1">
                      <div className="flex-col flex">
                        <span>{item.item?.label as any}</span>
                        {/* <span>{item.item.data?.description}</span> */}
                      </div>
                      {/* <span>{item.item.data?.amount}</span> */}
                      {/* <AnimatedNumber
                        value={item.item.data?.amount}
                        currency="NGN"
                      /> */}
                      <div className="flex-1"></div>
                    </div>
                  </div>
                );
              },
            }}
          />
          {/* <FormCombobox control={form.control}
          name="class" comboProps={{
            
          }} label="Classroom" /> */}
          {/* <Menu label={"Add Billing"}>
          <Menu.Item>Term Fee</Menu.Item>
          <Menu.Item>Enrollment Fee</Menu.Item>
        </Menu> */}
          {/* add form select, onselect update classroomId and departmentId */}
          <SubmitButton isSubmitting={isPending}>Enroll</SubmitButton>
          <div className="rounded-lg border border-border p-3">
            <h4 className="text-sm font-medium">
              Fees that will be applied on save
            </h4>
            {!applicableFeesPreview?.length ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No active term fees match this class selection.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {applicableFeesPreview.map((fee) => (
                  <li key={fee.feeHistoryId} className="rounded-md border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{fee.title}</span>
                      <span className="text-sm">
                        {new Intl.NumberFormat("en-NG", {
                          style: "currency",
                          currency: "NGN",
                        }).format(fee.amount)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fee.description || "No description"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Scope: {fee.scope} • Stream:{" "}
                      {fee.streamName || "Unassigned"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <FormDebugBtn />
        </form>
      </Form>
    </div>
  );
}
