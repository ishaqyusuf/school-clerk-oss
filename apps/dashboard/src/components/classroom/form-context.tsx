import { CreateClassRoom } from "@/actions/create-classroom";
import { createClassroomSchema } from "@/actions/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useFormContext } from "react-hook-form";

export function FormContext({ children }) {
  const form = useForm<CreateClassRoom>({
    resolver: zodResolver(createClassroomSchema),
    defaultValues: {
      className: "",
      departments: [
        {
          name: "",
        },
      ],
    },
  });

  return <FormProvider {...form}>{children}</FormProvider>;
}
export const useClassroomFormContext = () => useFormContext<CreateClassRoom>();
