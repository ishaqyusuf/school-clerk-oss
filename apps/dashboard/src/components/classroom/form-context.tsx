import { useEffect } from "react";
import { CreateClassRoom } from "@/actions/create-classroom";
import { createClassroomSchema } from "@/actions/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFormContext } from "react-hook-form";

export function FormContext({ children, defaultValues = undefined }) {
  const initialValues = {
    classRoomId: null,
    className: "",
    classLevel: null,
    hasSubClass: false,
    progressionMode: "classroom" as const,
    departments: [
      {
        name: "",
        departmentLevel: null,
      },
    ],
    defaultFeeAmount: null,
    defaultFeeDescription: null,
    defaultFeeTitle: null,
    defaultFeeStreamId: null,
    defaultFeeStreamName: null,
  };
  const form = useForm<CreateClassRoom>({
    resolver: zodResolver(createClassroomSchema),
    defaultValues: initialValues,
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset({
        classRoomId: defaultValues.classRoomId ?? null,
        className: defaultValues.className ?? "",
        classLevel: defaultValues.classLevel ?? null,
        hasSubClass: defaultValues.hasSubClass ?? false,
        progressionMode: defaultValues.progressionMode ?? "classroom",
        departments: defaultValues.departments?.length
          ? defaultValues.departments
          : initialValues.departments,
        defaultFeeAmount: defaultValues.defaultFeeAmount ?? null,
        defaultFeeDescription: defaultValues.defaultFeeDescription ?? null,
        defaultFeeTitle: defaultValues.defaultFeeTitle ?? null,
        defaultFeeStreamId: defaultValues.defaultFeeStreamId ?? null,
        defaultFeeStreamName: defaultValues.defaultFeeStreamName ?? null,
      });
      return;
    }
    form.reset(initialValues);
  }, [defaultValues, form]);

  return <FormProvider {...form}>{children}</FormProvider>;
}
export const useClassroomFormContext = () => useFormContext<CreateClassRoom>();
