import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { TableSkeleton } from "../tables/skeleton";
import { Suspense } from "react";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useStudentParams } from "@/hooks/use-student-params";

import { useZodForm } from "@/hooks/use-zod-form";
import { entrollStudentToTermSchema } from "@api/db/queries/enrollment-query";
import { Form } from "@school-clerk/ui/form";
import { useDebugToast } from "@/hooks/use-debug-console";
import { SubmitButton } from "../submit-button";
import { useStudentOverviewSheet } from "@/hooks/use-student-overview-sheet";
import { FormDebugBtn } from "../form-debug-btn";
import { createClassroomSchema, createSignupSchema } from "@/actions/schema";
import { FormCombobox } from "@school-clerk/ui/controls/form-combobox";
import { selectOptions } from "@school-clerk/utils";

export function StudentAcademicsOverview({}) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Content />
    </Suspense>
  );
}
function Content({}) {
  const { setParams, ...params } = useStudentParams();

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  // const { data, error, isLoading } = useSuspenseQuery(
  //   trpc.students.academicsOverview.queryOptions(
  //     {
  //       studentId: params.studentViewId,
  //       termSheetId: params.studentTermSheetId,
  //       termId: params.studentViewTermId,
  //     },
  //     {
  //       enabled: !!params.studentTermSheetId,
  //       staleTime: 60 * 1000,
  //     }
  //   )
  // );
  // useDebugConsole({ data, error });
  const ctx = useClassroomParams();
  const svc = useStudentOverviewSheet();
  if (!svc?.overviewData?.id) return null;
  // return <>abc</>;
  if (
    // (!isLoading && !data?.term?.studentTermId) ||
    !params.studentTermSheetId
  )
    return (
      <NotEntrolled
      // data={data}
      />
    );
  return (
    <>
      {/* <div>{JSON.stringify(data)}</div> */}
      <div className="">Entrolled</div>
    </>
  );
}
function NotEntrolled() {
  const svc = useStudentOverviewSheet();
  const { setParams, ...params } = useStudentParams();
  const term = svc?.overviewData?.studentTerms?.find(
    (t) => t.termId === params.studentViewTermId
  );
  const form = useZodForm(entrollStudentToTermSchema, {
    defaultValues: {
      studentId: svc.overviewData?.student?.id! || params?.studentViewId!,
      schoolSessionId: term?.termSessionId,
      sessionTermId: term?.termId,
      // termId: term?.termId,

      classroomDepartmentId: term?.departmentId,
      // classroomId: term?.classroomId,
      studentSessionFormId: term?.studentSessionId,
    },
  });

  const trpc = useTRPC();
  const qc = useQueryClient();
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
          <FormDebugBtn />
        </form>
      </Form>
    </div>
  );
}
