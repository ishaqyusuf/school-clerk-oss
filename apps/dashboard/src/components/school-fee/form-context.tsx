import { createSchoolFeeSchema } from "@/actions/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";

type Type = z.infer<typeof createSchoolFeeSchema>;
export function FormContext({ children }) {
  const form = useForm<Type>({
    resolver: zodResolver(createSchoolFeeSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: 0,
    },
  });

  return <FormProvider {...form}>{children}</FormProvider>;
}
export const useSchoolFeeFormContext = () => useFormContext<Type>();
