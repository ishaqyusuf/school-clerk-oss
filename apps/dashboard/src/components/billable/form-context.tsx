import { CreateBillableForm } from "@/actions/create-billable-action";
import { createBillableSchema, createClassroomSchema } from "@/actions/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFormContext } from "react-hook-form";

type Type = CreateBillableForm;
export function FormContext({ children }) {
  const form = useForm<Type>({
    resolver: zodResolver(createBillableSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  return <FormProvider {...form}>{children}</FormProvider>;
}
export const useBillableFormContext = () => useFormContext<Type>();
