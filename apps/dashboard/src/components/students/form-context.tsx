import { createStudentSchema } from "@/actions/schema";
import { useZodForm } from "@/hooks/use-zod-form";
import { useEffect } from "react";
import { FormProvider, useFormContext } from "react-hook-form";
import { z } from "zod";

type Type = z.infer<typeof createStudentSchema>;
const _defaultValues = {
  name: "",
  surname: "",
  otherName: "",
  gender: "Male",
  dob: null,
  classRoomId: null,
  fees: [],
  termForms: [],
  guardian: {
    id: null,
    name: null,
    phone: null,
    phone2: null,
  },
} satisfies Type;
interface Props {
  defaultValues?: Type;
  children?;
}
export function FormContext({ children, defaultValues = null }: Props) {
  const form = useZodForm(createStudentSchema, {
    // resolver: zodResolver(createStudentSchema),
    defaultValues: _defaultValues,
  });
  useEffect(() => {
    form.reset(defaultValues || _defaultValues);
  }, [defaultValues]);
  return <FormProvider {...form}>{children}</FormProvider>;
}
export const useStudentFormContext = () => useFormContext<Type>();
