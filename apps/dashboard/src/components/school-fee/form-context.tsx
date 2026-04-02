import { createSchoolFeeSchema } from "@/actions/schema";
import { useSchoolFeeParams } from "@/hooks/use-school-fee-params";
import { useTRPC } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import type { z } from "zod";

type Type = z.infer<typeof createSchoolFeeSchema>;
export function FormContext({ children }) {
	const trpc = useTRPC();
	const { schoolFeeId } = useSchoolFeeParams();
	const form = useForm<Type>({
		resolver: zodResolver(createSchoolFeeSchema),
		defaultValues: {
			feeId: "",
			title: "",
			description: "",
			amount: 0,
			streamId: "",
			streamName: "",
			classroomDepartmentIds: [],
		},
	});
	const { data: fees = [] } = useQuery(
		trpc.transactions.getSchoolFees.queryOptions(),
	);

	useEffect(() => {
		if (!schoolFeeId) {
			form.reset({
				feeId: "",
				title: "",
				description: "",
				amount: 0,
				streamId: "",
				streamName: "",
				classroomDepartmentIds: [],
			});
			return;
		}

		const fee = fees.find((item) => item.id === schoolFeeId);
		if (!fee) return;

		const currentHistory = fee.feeHistory?.[0];
		form.reset({
			feeId: fee.id,
			title: fee.title || "",
			description: fee.description || "",
			amount: currentHistory?.amount ?? fee.amount ?? 0,
			streamId: currentHistory?.wallet?.id ?? "",
			streamName: currentHistory?.wallet?.name ?? "",
			classroomDepartmentIds:
				currentHistory?.classroomDepartments?.map(
					(department) => department.id,
				) ?? [],
		});
	}, [fees, form, schoolFeeId]);

	return <FormProvider {...form}>{children}</FormProvider>;
}
export const useSchoolFeeFormContext = () => useFormContext<Type>();
