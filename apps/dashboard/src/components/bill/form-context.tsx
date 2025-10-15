import { createBillSchema, createStudentSchema } from "@/actions/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";

type Type = z.infer<typeof createBillSchema>;
export function FormContext({ children }) {
  const form = useForm<Type>({
    resolver: zodResolver(createBillSchema),
    defaultValues: {},
  });

  return <FormProvider {...form}>{children}</FormProvider>;
}
export const useBillFormContext = () => useFormContext<Type>();
