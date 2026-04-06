"use client";

import { useBillParams } from "@/hooks/use-bill-params";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/custom/icons";

import { AnimatedNumber } from "../animated-number";
import { useBillFormContext } from "../bill/form-context";
import FormInput from "../controls/form-input";
import FormSelect from "../controls/form-select";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { Menu } from "../menu";
import { SubmitButton } from "../submit-button";

export function Form() {
	const { setParams } = useBillParams();
	const { watch, control, getValues, setValue, trigger, handleSubmit } =
		useBillFormContext();
	const toast = useLoadingToast();
	const trpc = useTRPC();
	const qc = useQueryClient();

	const { data: billables } = useQuery(
		trpc.finance.getBillables.queryOptions(),
	);
	const { data: staffs } = useQuery(trpc.staff.getStaffList.queryOptions());

	const { mutate, isPending } = useMutation(
		trpc.finance.createBill.mutationOptions({
			onSuccess() {
				toast.success("Created");
				qc.invalidateQueries({ queryKey: trpc.finance.getBills.queryKey() });
				setParams(null);
			},
		}),
	);

	const [selectedBillableId] = watch(["selectedBillableId"]);

	useEffect(() => {
		const billable =
			selectedBillableId === "custom"
				? null
				: billables?.find((b) => b.id === selectedBillableId);
		setValue("title", billable?.title || "");
		setValue("billableId", billable?.id || "");
		setValue("billableHistoryId", billable?.historyId || "");
		setValue("description", billable?.description || "");
		setValue("amount", billable?.amount || "");
	}, [selectedBillableId, billables, setValue]);

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4">
				<FormSelect
					name="selectedBillableId"
					label="Billable"
					titleKey="description"
					valueKey="id"
					options={[
						{ title: "Custom", description: "", amount: null, id: "custom" },
						...(billables || []),
					]}
					control={control}
					Item={({ option }) => (
						<div className="flex w-full">
							<div className="flex gap-1">
								<span>{option?.title}</span>
								<span>{option?.description}</span>
								<span>
									{!option?.amount || <AnimatedNumber value={option?.amount} />}
								</span>
							</div>
						</div>
					)}
				/>
				<FormSelect
					name="staffTermProfileId"
					label="Bill For"
					control={control}
					options={staffs?.items || []}
					titleKey="name"
					valueKey="staffTermId"
				/>
				<FormInput name="title" label="Title" control={control} />
				<FormInput
					name="amount"
					type="number"
					label="Amount"
					control={control}
				/>
			</div>
			<FormInput name="description" label="Description" control={control} />

			<CustomSheetContentPortal>
				<div className="flex justify-end">
					<form
						onSubmit={handleSubmit(
							(data) => mutate(data),
							() => toast.error("Invalid Form"),
						)}
					>
						<div className="flex">
							<SubmitButton size="sm" isSubmitting={isPending}>
								Submit
							</SubmitButton>
							<Menu
								Icon={Icons.more}
								Trigger={
									<Button className="border-l" type="button" size="sm">
										<span>&</span>
									</Button>
								}
							>
								<Menu.Item
									onClick={async () => {
										const isValid = await trigger();
										if (isValid) {
											mutate(getValues());
										} else {
											toast.error("Invalid Form");
										}
									}}
								>
									New
								</Menu.Item>
							</Menu>
						</div>
					</form>
				</div>
			</CustomSheetContentPortal>
		</div>
	);
}
