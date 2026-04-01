import { createStaffSchema } from "@/actions/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import type React from "react";
import { useEffect } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import type { z } from "zod";

type Type = z.infer<typeof createStaffSchema>;
const defaultValues: Type = {
	address: undefined,
	classRoomDepartmentIds: [],
	departmentSubjectIds: [],
	email: undefined,
	name: "",
	phone: undefined,
	phone2: undefined,
	role: "Teacher",
	sendInvite: false,
	staffId: undefined,
	title: "",
};

export function FormContext({
	children,
	values,
}: {
	children: React.ReactNode;
	values?: Partial<Type>;
}) {
	const form = useForm<Type>({
		resolver: zodResolver(createStaffSchema),
		defaultValues: {
			...defaultValues,
			...values,
		},
	});

	useEffect(() => {
		form.reset({
			...defaultValues,
			...values,
		});
	}, [form, values]);

	return <FormProvider {...form}>{children}</FormProvider>;
}
export const useStaffFormContext = () => useFormContext<Type>();
