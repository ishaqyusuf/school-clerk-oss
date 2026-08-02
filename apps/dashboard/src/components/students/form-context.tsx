import { createStudentSchema } from "@/actions/schema";
import { useZodForm } from "@/hooks/use-zod-form";
import { useEffect, useMemo } from "react";
import { FormProvider, useFormContext } from "react-hook-form";
import type { z } from "zod";

type Type = z.infer<typeof createStudentSchema>;
const _defaultValues = {
	name: "",
	surname: "",
	otherName: "",
	gender: "Male",
	dob: null,
	classRoomId: null,
	admissionType: "UNCLASSIFIED",
	selectedOptionalFeeItemIds: [],
	feePayments: [],
	paymentDetails: {
		method: "CASH",
		reference: "",
		paymentDate: new Date(),
	},
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
	defaultValues?: Partial<Omit<Type, "guardian" | "paymentDetails">> & {
		guardian?: Partial<NonNullable<Type["guardian"]>>;
		paymentDetails?: Partial<NonNullable<Type["paymentDetails"]>>;
	};
	children?;
}
export function FormContext({ children, defaultValues = null }: Props) {
	const resolvedDefaultValues = useMemo(
		() =>
			({
				..._defaultValues,
				...defaultValues,
				guardian: {
					..._defaultValues.guardian,
					...defaultValues?.guardian,
				},
				paymentDetails: {
					..._defaultValues.paymentDetails,
					...defaultValues?.paymentDetails,
				},
			}) satisfies Type,
		[defaultValues],
	);
	const form = useZodForm(createStudentSchema, {
		// resolver: zodResolver(createStudentSchema),
		defaultValues: resolvedDefaultValues,
	});
	const { reset } = form;
	useEffect(() => {
		reset(resolvedDefaultValues);
	}, [reset, resolvedDefaultValues]);
	return <FormProvider {...form}>{children}</FormProvider>;
}
export const useStudentFormContext = () => useFormContext<Type>();
