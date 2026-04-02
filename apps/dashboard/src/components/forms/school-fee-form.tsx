"use client";

import FormMultipleSelector from "@/components/controls/form-multiple-selector";
import { useSchoolFeeParams } from "@/hooks/use-school-fee-params";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Label } from "@school-clerk/ui/label";

import FormInput from "../controls/form-input";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useSchoolFeeFormContext } from "../school-fee/form-context";
import { SubmitButton } from "../submit-button";

export function Form() {
	const { schoolFeeId, setParams } = useSchoolFeeParams();
	const { control, handleSubmit, watch, setValue } = useSchoolFeeFormContext();
	const trpc = useTRPC();
	const qc = useQueryClient();

	const { data: streams = [] } = useQuery(
		trpc.finance.getStreams.queryOptions({ filter: "term" }),
	);
	const { data: classrooms } = useQuery(
		trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
	);
	const [streamId, streamName] = watch(["streamId", "streamName"]);

	const streamOptions = useMemo(
		() =>
			streams.map((stream) => ({
				id: stream.id,
				label: stream.name,
			})),
		[streams],
	);
	const selectedStream =
		streamOptions.find((stream) => stream.id === streamId) ||
		(streamName
			? {
					id: "__new__",
					label: `${streamName} (new)`,
				}
			: undefined);
	const classroomOptions =
		classrooms?.data?.map((department) => ({
			value: department.id,
			label: department.displayName,
		})) ?? [];

	const { mutate, isPending } = useMutation(
		trpc.transactions.createSchoolFee.mutationOptions({
			onSuccess() {
				qc.invalidateQueries({
					queryKey: trpc.transactions.getSchoolFees.queryKey(),
				});
				qc.invalidateQueries({
					queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
				});
				qc.invalidateQueries({
					queryKey: trpc.transactions.getPreviousTermFees.queryKey(),
				});
				setParams(null);
			},
		}),
	);

	return (
		<div className="grid gap-4">
			<FormInput name="title" label="Fee Title" control={control} />
			<FormInput
				name="description"
				label="Description"
				type="textarea"
				control={control}
			/>
			<FormInput name="amount" type="number" label="Amount" control={control} />
			<div className="grid gap-2">
				<Label>Incoming Stream</Label>
				<ComboboxDropdown
					items={streamOptions}
					selectedItem={selectedStream}
					placeholder="Select or create a stream"
					searchPlaceholder="Search or create stream..."
					onSelect={(stream) => {
						setValue("streamId", stream.id);
						setValue("streamName", stream.label);
					}}
					onCreate={(value) => {
						setValue("streamId", "");
						setValue("streamName", value.trim());
					}}
					renderOnCreate={(value) => (
						<span>Create new incoming stream "{value}"</span>
					)}
				/>
				<p className="text-sm text-muted-foreground">
					New streams created here default to incoming revenue streams.
				</p>
			</div>
			<FormMultipleSelector
				control={control}
				name="classroomDepartmentIds"
				label="Applicable Classrooms"
				options={classroomOptions}
				placeholder="Leave empty to apply to all classes"
			/>
			<CustomSheetContentPortal>
				<form
					className="grid gap-4"
					onSubmit={handleSubmit((data) => mutate(data))}
				>
					<div className="flex justify-end">
						<SubmitButton isSubmitting={isPending}>
							{schoolFeeId ? "Update Fee" : "Create Fee"}
						</SubmitButton>
					</div>
				</form>
			</CustomSheetContentPortal>
		</div>
	);
}
