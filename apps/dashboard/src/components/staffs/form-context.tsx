import { createStaffSchema, createStudentSchema } from "@/actions/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { z } from "zod";

type Type = z.infer<typeof createStaffSchema>;
export function FormContext({ children }) {
  const form = useForm<Type>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      name: undefined,
      address: undefined,
      email: undefined,
      phone: undefined,
      phone2: undefined,
      title: undefined,
    },
  });

  return <FormProvider {...form}>{children}</FormProvider>;
}
export const useStaffFormContext = () => useFormContext<Type>();
