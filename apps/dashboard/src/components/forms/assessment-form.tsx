import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { saveSubjectSchema } from "@api/db/queries/subjects";
import { Form } from "@school-clerk/ui/form";
import { useFormContext } from "react-hook-form";
import { SubmitButton } from "../submit-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { Suspense, useEffect } from "react";
import { FormSkeleton } from "@school-clerk/ui/custom/form-skeleton";
import { toast } from "@school-clerk/ui/use-toast";
import { saveAssessementSchema } from "@api/db/queries/assessments";
import { _trpc } from "../static-trpc";
interface Props {
  defaultValues?: typeof saveAssessementSchema._type;
  children?;
}
export function AssessmentForm(props: Props) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}
function Content(props: Props) {
  const trpc = useTRPC();
  const form = useZodForm(saveAssessementSchema, {
    defaultValues: {
      departmentSubjectId: "",
      id: undefined,
      index: undefined,
      obtainable: null,
      percentageObtainable: 0,
      title: "",
    },
  });
  const { data: sugestions } = useQuery(
    _trpc.assessments.getAssessmentSuggestions.queryOptions({
      deptSubjectId: props.defaultValues.departmentSubjectId,
    })
  );
  useEffect(() => {
    form.reset({
      ...props.defaultValues,
    });
  }, [props.defaultValues]);
  // const { data } = useSuspenseQuery(trpc.subjects.formData.queryOptions({}));
  return (
    <Form {...form}>
      <div className="space-y-4">
        <div className="grid gap-4">
          <FormInput label="Title" control={form.control} name="title" />
          <div className="grid grid-cols-4 gap-4">
            <div className=""></div>
            <div className=""></div>
            <FormInput
              label="Score"
              control={form.control}
              name="obtainable"
              numericProps={{
                type: "tel",
              }}
            />
            <FormInput
              label="Score %"
              control={form.control}
              name="percentageObtainable"
              numericProps={{
                type: "tel",
              }}
            />
          </div>
        </div>
        {props.children}
      </div>
    </Form>
  );
}
interface FormActionProps {
  onSuccess?;
  onError?;
}
export function AssessmentFormAction(props: FormActionProps) {
  const form = useFormContext();
  const trpc = useTRPC();
  const onSubmit = async (data: typeof saveAssessementSchema._type) => {
    mutate(data);
  };

  const { isPending, mutate } = useMutation(
    trpc.assessments.saveAssessement.mutationOptions({
      onSuccess(data, variables, context) {
        props?.onSuccess(data);
      },
      onError(data, variables, context) {
        props?.onError(data);
      },
      meta: {
        toastTitle: {
          error: "Something went wrong",
          loading: "Saving...",
          success: "Success",
        },
      },
    })
  );
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit, (e) => {
        toast({
          title: "Invalid Form Data",
          variant: "error",
          description: JSON.stringify(e),
        });
      })}
    >
      <div className="">
        <SubmitButton isSubmitting={isPending}>Save</SubmitButton>
      </div>
    </form>
  );
}
