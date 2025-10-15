import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { saveSubjectSchema } from "@api/db/queries/subjects";
import { Form } from "@school-clerk/ui/form";
import { useFormContext } from "react-hook-form";
import { SubmitButton } from "../submit-button";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { Suspense, useEffect } from "react";
import { FormSkeleton } from "@school-clerk/ui/custom/form-skeleton";
import { FormCombobox } from "@school-clerk/ui/controls/form-combobox";
import { toast } from "@school-clerk/ui/use-toast";

interface Props {
  defaultValues?: typeof saveSubjectSchema._type;
  children?;
}
export function SubjectForm(props: Props) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <Content {...props} />
    </Suspense>
  );
}
function Content(props: Props) {
  const trpc = useTRPC();
  const form = useZodForm(saveSubjectSchema, {
    defaultValues: {
      departmentId: "",
      departmentSubjectId: "",
      sessionTermId: "",
      subjectId: "",
      title: "",
      description: "",
    },
  });
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
          <FormInput label="Name" control={form.control} name="title" />
          <FormInput
            label="Description"
            control={form.control}
            name="description"
          />
          {/* <FormCombobox control={form.control}
          label="Department"  */}
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
export function SubjectFormAction(props: FormActionProps) {
  const form = useFormContext();
  const trpc = useTRPC();
  const onSubmit = async (data: typeof saveSubjectSchema._type) => {
    mutate(data);
  };
  const { isPending, mutate } = useMutation(
    trpc.subjects.saveSubject.mutationOptions({
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
