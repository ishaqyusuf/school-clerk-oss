"use client";

import { useBillParams } from "@/hooks/use-bill-params";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/custom/icons";
import { Label } from "@school-clerk/ui/label";

import { AnimatedNumber } from "../animated-number";
import { useBillFormContext } from "../bill/form-context";
import FormInput from "../controls/form-input";
import FormSelect from "../controls/form-select";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { Menu } from "../menu";
import { SubmitButton } from "../submit-button";

export function Form() {
	const { setParams } = useBillParams();
	const { watch, control, setValue, trigger, handleSubmit } = useBillFormContext();
	const toast = useLoadingToast();
	const trpc = useTRPC();
	const qc = useQueryClient();

	const { data: billables = [] } = useQuery(
		trpc.finance.getBillables.queryOptions(),
	);
	const { data: staffs } = useQuery(trpc.staff.getStaffList.queryOptions());

	const createBill = useMutation(trpc.finance.createBill.mutationOptions());
	const createBillable = useMutation(trpc.finance.createBillable.mutationOptions());

	const [selectedBillableId, title] = watch(["selectedBillableId", "title"]);
	const billableOptions = useMemo(
		() =>
			billables.map((billable) => ({
				...billable,
				label: billable.title,
			})),
		[billables],
	);
	const selectedBillable =
		billableOptions.find((billable) => billable.id === selectedBillableId) ||
		(title?.trim()
			? {
					id: "__custom__",
					label: title.trim(),
					title: title.trim(),
					description: "",
					amount: null,
					historyId: "",
					streamId: null,
					streamName: null,
					classroomDepartments: [],
					type: "OTHER" as const,
				}
			: undefined);

	useEffect(() => {
		const billable = billables.find((b) => b.id === selectedBillableId);
		if (!billable) {
			setValue("billableId", "");
			setValue("billableHistoryId", "");
			return;
		}
		setValue("title", billable?.title || "");
		setValue("billableId", billable?.id || "");
		setValue("billableHistoryId", billable?.historyId || "");
		setValue("description", billable?.description || "");
		setValue("amount", billable?.amount ?? 0);
	}, [selectedBillableId, billables, setValue]);

	const onSubmit = handleSubmit(
		async (data) => {
			try {
				let billableId = data.billableId || "";
				let billableHistoryId = data.billableHistoryId || "";

				if (!billableId && data.title.trim()) {
					const createdBillable = await createBillable.mutateAsync({
						title: data.title.trim(),
						amount: data.amount,
						description: data.description,
						type: "OTHER",
						classroomDepartmentIds: [],
					});
					billableId = createdBillable.id;
					billableHistoryId = createdBillable.historyId || "";
				}

				await createBill.mutateAsync({
					...data,
					title: data.title.trim(),
					billableId,
					billableHistoryId,
				});

				qc.invalidateQueries({ queryKey: trpc.finance.getBills.queryKey() });
				qc.invalidateQueries({ queryKey: trpc.finance.getBillables.queryKey() });
				toast.success("Created");
				setParams(null);
			} catch (_error) {
				toast.error("Unable to create bill");
			}
		},
		() => toast.error("Invalid Form"),
	);

	const isPending = createBill.isPending || createBillable.isPending;

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="grid gap-2">
					<Label>Bill Title</Label>
					<ComboboxDropdown
						items={billableOptions}
						selectedItem={selectedBillable}
						placeholder="Select or create a service billable"
						searchPlaceholder="Search or create service billable..."
						onSelect={(billable) => {
							setValue("selectedBillableId", billable.id, {
								shouldDirty: true,
								shouldValidate: true,
							});
						}}
						onCreate={(value) => {
							const nextTitle = value.trim();
							setValue("selectedBillableId", "", {
								shouldDirty: true,
								shouldValidate: true,
							});
							setValue("title", nextTitle, {
								shouldDirty: true,
								shouldValidate: true,
							});
							setValue("billableId", "");
							setValue("billableHistoryId", "");
						}}
						renderOnCreate={(value) => (
							<span>Create service billable "{value}"</span>
						)}
						renderListItem={({ item }) => (
							<div className="flex w-full items-center gap-2">
								<span className="font-medium">{item.title}</span>
								<span className="text-muted-foreground truncate">
									{item.description}
								</span>
								<span className="ml-auto">
									{!item.amount || <AnimatedNumber value={item.amount} />}
								</span>
							</div>
						)}
					/>
				</div>
				<FormSelect
					name="staffTermProfileId"
					label="Bill For"
					control={control}
					options={staffs?.items || []}
					titleKey="name"
					valueKey="staffTermId"
				/>
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
					<form onSubmit={onSubmit}>
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
											await onSubmit();
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
