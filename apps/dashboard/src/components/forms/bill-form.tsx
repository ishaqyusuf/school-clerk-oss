"use client";

import { useBillParams } from "@/hooks/use-bill-params";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

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

	const { data: streams = [] } = useQuery(
		trpc.finance.getStreams.queryOptions({ filter: "term" }),
	);
	const { data: staffs } = useQuery(trpc.staff.getStaffList.queryOptions());

	const createBill = useMutation(trpc.finance.createBill.mutationOptions());
	const [streamId, streamName, title] = watch(["streamId", "streamName", "title"]);
	const streamOptions = useMemo(
		() =>
			streams
				.filter((stream) => stream.type === "bill" || stream.defaultType === "outgoing")
				.map((stream) => ({
					id: stream.id,
					name: stream.name,
					label: stream.name,
					description:
						stream.type === "bill"
							? "Bill stream"
							: `${stream.defaultType === "outgoing" ? "Outgoing" : "Incoming"} stream`,
					amount: stream.balance,
				})),
		[streams],
	);
	const selectedStream =
		streamOptions.find((stream) => stream.id === streamId) ||
		(streamName?.trim() || title?.trim()
			? {
					id: streamId || "__new__",
					name: (streamName || title).trim(),
					label: (streamName || title).trim(),
					description: "New bill stream",
					amount: null,
				}
			: undefined);

	const onSubmit = handleSubmit(
		async (data) => {
			try {
				const resolvedTitle = data.title.trim();
				await createBill.mutateAsync({
					...data,
					title: resolvedTitle,
					streamName: data.streamName?.trim() || resolvedTitle,
					billableId: "",
					billableHistoryId: "",
				});

				qc.invalidateQueries({ queryKey: trpc.finance.getBills.queryKey() });
				qc.invalidateQueries({
					queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
				});
				toast.success("Created");
				setParams(null);
			} catch (_error) {
				toast.error("Unable to create bill");
			}
		},
		() => toast.error("Invalid Form"),
	);

	const isPending = createBill.isPending;

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4">
				<div className="grid gap-2">
					<Label>Bill Title</Label>
					<ComboboxDropdown
						items={streamOptions}
						selectedItem={selectedStream}
						placeholder="Select or create an account bill stream"
						searchPlaceholder="Search or create account bill stream..."
						onSelect={(stream) => {
							setValue("streamId", stream.id, {
								shouldDirty: true,
								shouldValidate: true,
							});
							setValue("streamName", stream.name, {
								shouldDirty: true,
								shouldValidate: true,
							});
							setValue("title", stream.name, {
								shouldDirty: true,
								shouldValidate: true,
							});
							setValue("selectedBillableId", null, {
								shouldDirty: true,
								shouldValidate: true,
							});
							setValue("billableId", "");
							setValue("billableHistoryId", "");
						}}
						onCreate={(value) => {
							const nextTitle = value.trim();
							setValue("streamId", "", {
								shouldDirty: true,
								shouldValidate: true,
							});
							setValue("streamName", nextTitle, {
								shouldDirty: true,
								shouldValidate: true,
							});
							setValue("title", nextTitle, {
								shouldDirty: true,
								shouldValidate: true,
							});
							setValue("selectedBillableId", null, {
								shouldDirty: true,
								shouldValidate: true,
							});
							setValue("billableId", "");
							setValue("billableHistoryId", "");
						}}
						renderOnCreate={(value) => (
							<span>Create account bill stream "{value}"</span>
						)}
						renderListItem={({ item }) => (
							<div className="flex w-full items-center gap-2">
								<span className="font-medium">{item.name}</span>
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
