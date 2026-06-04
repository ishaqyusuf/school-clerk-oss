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
			collectionStatus: "NOT_COLLECTED",
			classroomDepartmentIds: [],
		},
	});
	const { data: fees = [] } = useQuery(trpc.finance.getItems.queryOptions());

	useEffect(() => {
		if (!schoolFeeId) {
			form.reset({
				feeId: "",
				title: "",
				description: "",
				amount: 0,
				streamId: "",
				streamName: "",
				collectionStatus: "NOT_COLLECTED",
				classroomDepartmentIds: [],
			});
			return;
		}

		const fee = fees.find((item) => item.id === schoolFeeId);
		if (!fee) return;

		form.reset({
			feeId: fee.id,
			title: fee.streamName || fee.title || "",
			description: fee.description || fee.name || "",
			amount: fee.amount ?? 0,
			streamId: fee.streamId ?? "",
			streamName: fee.streamName ?? "",
			collectionStatus: fee.collectable ? "NOT_COLLECTED" : "NOT_REQUIRED",
			classroomDepartmentIds:
				fee.classroomDepartments?.map(
					(department) => department.id,
				) ?? [],
		});
	}, [fees, form, schoolFeeId]);

	return <FormProvider {...form}>{children}</FormProvider>;
}
export const useSchoolFeeFormContext = () => useFormContext<Type>();
