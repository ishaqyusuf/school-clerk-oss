import type { CreateBillableForm } from "@/actions/create-billable-action";
import { createBillableSchema } from "@/actions/schema";
import { useTermBillableParams } from "@/hooks/use-term-billable-params";
import { useTRPC } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";

type Type = CreateBillableForm;
export function FormContext({ children }) {
	const trpc = useTRPC();
	const { billableId } = useTermBillableParams();
	const form = useForm<Type>({
		resolver: zodResolver(createBillableSchema),
		defaultValues: {
			billableId: "",
			title: "",
			amount: 0,
			description: "",
			streamId: "",
			streamName: "",
			classroomDepartmentIds: [],
		},
	});
	const { data: billables = [] } = useQuery(
		trpc.finance.getBillables.queryOptions(),
	);

	useEffect(() => {
		if (!billableId) {
			form.reset({
				billableId: "",
				title: "",
				amount: 0,
				description: "",
				streamId: "",
				streamName: "",
				classroomDepartmentIds: [],
			});
			return;
		}

		const billable = billables.find((item) => item.id === billableId);
		if (!billable) return;

		form.reset({
			billableId: billable.id,
			title: billable.title || "",
			amount: billable.amount ?? 0,
			description: billable.description || "",
			streamId: billable.streamId ?? "",
			streamName: billable.streamName ?? "",
			classroomDepartmentIds:
				billable.classroomDepartments?.map((department) => department.id) ?? [],
		});
	}, [billableId, billables, form]);

	return <FormProvider {...form}>{children}</FormProvider>;
}
export const useBillableFormContext = () => useFormContext<Type>();
