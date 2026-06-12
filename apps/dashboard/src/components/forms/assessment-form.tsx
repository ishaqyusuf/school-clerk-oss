import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { Form } from "@school-clerk/ui/form";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { SubmitButton } from "../submit-button";
import { useMutation } from "@tanstack/react-query";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { Suspense, useEffect, useMemo } from "react";
import { FormSkeleton } from "@school-clerk/ui/custom/form-skeleton";
import { toast } from "@school-clerk/ui/use-toast";
import { saveAssessementSchema } from "@school-clerk/assessment-results";
import FormSwitch from "@school-clerk/ui/controls/form-switch";
import { Button } from "@school-clerk/ui/button";
import { Badge } from "@school-clerk/ui/badge";
import { Plus, Trash2 } from "lucide-react";
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
  const form = useZodForm(saveAssessementSchema, {
    defaultValues: {
      departmentSubjectId: "",
      id: undefined,
      index: undefined,
      obtainable: 0,
      percentageObtainable: 0,
      title: "",
      isGroup: false,
      parentAssessmentId: null,
      childAssessments: [],
    },
  });
  useEffect(() => {
    form.reset({
      obtainable: 0,
      percentageObtainable: 0,
      isGroup: false,
      parentAssessmentId: null,
      childAssessments: [],
      ...props.defaultValues,
    });
  }, [props.defaultValues]);
  const childAssessmentsFieldArray = useFieldArray({
    control: form.control,
    name: "childAssessments",
    keyName: "_id",
  });
  const isGroup = useWatch({
    control: form.control,
    name: "isGroup",
  });
  const childAssessments = useWatch({
    control: form.control,
    name: "childAssessments",
  });
  const childTotals = useMemo(
    () =>
      (childAssessments ?? []).reduce(
        (totals, child) => ({
          obtainable: totals.obtainable + (child?.obtainable ?? 0),
          percentageObtainable:
            totals.percentageObtainable + (child?.percentageObtainable ?? 0),
        }),
        {
          obtainable: 0,
          percentageObtainable: 0,
        },
      ),
    [childAssessments],
  );

  return (
    <Form {...form}>
      <div className="space-y-4">
        <div className="grid gap-4 rounded-2xl border border-border bg-muted/20 p-4">
          <FormInput label="Title" control={form.control} name="title" />
          <FormSwitch
            control={form.control}
            name="isGroup"
            label="Split into sub-assessments"
            defaultSwitchLabel="Single score item"
            switchLabel={{
              active: "Grouped assessment",
              inactive: "Single score item",
            }}
            defaultDescription="Use this when one assessment should contain optional parts like Pages Memorized or Pages Revised."
          />

          {isGroup ? (
            <div className="space-y-4 rounded-2xl border border-dashed border-border bg-background p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Sub-assessments
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Only these child items will be scoreable and counted in reports.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    childAssessmentsFieldArray.append({
                      title: "",
                      obtainable: 0,
                      percentageObtainable: 0,
                    })
                  }
                >
                  <Plus className="mr-2 size-4" />
                  Add sub-assessment
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {childTotals.obtainable} points total
                </Badge>
                <Badge variant="neutral" className="rounded-full px-3 py-1">
                  {childTotals.percentageObtainable}% total weight
                </Badge>
              </div>

              {childAssessmentsFieldArray.fields.length ? (
                <div className="space-y-3">
                  {childAssessmentsFieldArray.fields.map((field, index) => (
                    <div
                      key={field._id}
                      className="rounded-2xl border border-border bg-muted/20 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">
                          Part {index + 1}
                        </p>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => childAssessmentsFieldArray.remove(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <FormInput
                          label="Title"
                          control={form.control}
                          name={`childAssessments.${index}.title`}
                        />
                        <FormInput
                          label="Obtainable"
                          control={form.control}
                          name={`childAssessments.${index}.obtainable`}
                          numericProps={{
                            type: "tel",
                          }}
                        />
                        <FormInput
                          label="Weight %"
                          control={form.control}
                          name={`childAssessments.${index}.percentageObtainable`}
                          numericProps={{
                            type: "tel",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  Add at least one sub-assessment to make this a grouped exam or assessment.
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput
                label="Obtainable"
                control={form.control}
                name="obtainable"
                numericProps={{
                  type: "tel",
                }}
              />
              <FormInput
                label="Weight %"
                control={form.control}
                name="percentageObtainable"
                numericProps={{
                  type: "tel",
                }}
              />
            </div>
          )}
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
