"use client";

import FormMultipleSelector from "@/components/controls/form-multiple-selector";
import { useTermBillableParams } from "@/hooks/use-term-billable-params";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Label } from "@school-clerk/ui/label";

import { useBillableFormContext } from "../billable/form-context";
import FormInput from "../controls/form-input";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { SubmitButton } from "../submit-button";

export function Form() {
	const { setParams } = useTermBillableParams();
	const { control, handleSubmit, watch, setValue } = useBillableFormContext();
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
		trpc.finance.createBillable.mutationOptions({
			onSuccess() {
				qc.invalidateQueries({
					queryKey: trpc.finance.getBillables.queryKey(),
				});
				qc.invalidateQueries({
					queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
				});
				setParams(null);
			},
		}),
	);

	return (
		<div className="grid gap-4">
			<FormInput
				name="title"
				label="Service Billable Title"
				control={control}
			/>
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
						<span>Create new service stream "{value}"</span>
					)}
				/>
				<p className="text-sm text-muted-foreground">
					Use service billables for staff or operational costs, not student
					fees.
				</p>
			</div>
			<FormMultipleSelector
				control={control}
				name="classroomDepartmentIds"
				label="Classroom departments"
				options={classroomOptions}
				placeholder="Leave empty to make this billable all-inclusive"
			/>
			<CustomSheetContentPortal>
				<form
					className="grid gap-4"
					onSubmit={handleSubmit((data) => mutate(data))}
				>
					<div className="flex justify-end">
						<SubmitButton isSubmitting={isPending}>Submit</SubmitButton>
					</div>
				</form>
			</CustomSheetContentPortal>
		</div>
	);
}
