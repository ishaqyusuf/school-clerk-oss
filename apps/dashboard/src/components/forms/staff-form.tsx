"use client";

import { saveStaffAction } from "@/actions/save-staff";
import type { Option } from "@school-clerk/ui/multiple-selector";
import { useAction } from "next-safe-action/hooks";

import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useStaffParams } from "@/hooks/use-staff-params";
import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/custom/icons";

import FormCheckbox from "../controls/form-checkbox";
import FormInput from "../controls/form-input";
import FormMultipleSelector from "../controls/form-multiple-selector";
import FormSelect from "../controls/form-select";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { Menu } from "../menu";
import { useStaffFormContext } from "../staffs/form-context";
import { SubmitButton } from "../submit-button";

type Props = {
	staffId?: string | null;
	submitLabel?: string;
	closeOnSuccess?: boolean;
};

export function Form({
	staffId,
	submitLabel = "Save",
	closeOnSuccess = false,
}: Props) {
	const { setParams } = useStaffParams();
	const { control, getValues, handleSubmit, trigger, reset } =
		useStaffFormContext();
	const toast = useLoadingToast();
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const { data: formData, isLoading } = useQuery(
		trpc.staff.getFormData.queryOptions(
			{
				staffId: staffId || undefined,
			},
			{
				enabled: true,
			},
		),
	);

	const saveStaff = useAction(saveStaffAction, {
		onSuccess({ data }) {
			if (!data) return;

			queryClient.invalidateQueries({
				queryKey: trpc.staff.getStaffList.queryKey(),
			});
			if (staffId) {
				queryClient.invalidateQueries({
					queryKey: trpc.staff.getFormData.queryKey({
						staffId,
					}),
				});
			}

			if (data.inviteError) {
				toast.error("Staff saved, but invite email could not be sent.");
			} else if (data.invited) {
				toast.success("Invite email sent.");
			} else {
				toast.success(staffId ? "Staff updated." : "Teacher created.");
			}

			if (closeOnSuccess) {
				setParams({ createStaff: null });
				reset();
			}
		},
		onError() {
			toast.error("Could not save staff.");
		},
	});

	const classroomOptions = (formData?.classrooms ?? []) as Option[];
	const subjectOptions = (formData?.subjects ?? []) as Option[];

	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-[120px_1fr]">
				<FormSelect
					className="w-full"
					name="title"
					label="Title"
					options={["Mr", "Mrs", "Ustaadh", "Ustaadha", "Dr"]}
					control={control}
				/>
				<FormInput
					className="flex-1"
					name="name"
					label="Name"
					control={control}
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<FormInput name="email" label="Email" control={control} />
				<FormSelect
					name="role"
					label="Role"
					control={control}
					options={formData?.roles ?? []}
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<FormInput name="phone" label="Phone" control={control} />
				<FormInput name="phone2" label="Phone 2" control={control} />
			</div>

			<FormInput name="address" label="Address" control={control} />

			<FormCheckbox
				control={control}
				name="sendInvite"
				switchInput
				label="Send onboarding email"
				description="Email this staff member a link to set their password and join the dashboard."
			/>

			<div className="grid gap-4">
				<FormMultipleSelector
					control={control}
					name="classRoomDepartmentIds"
					label="Allowed classrooms"
					options={classroomOptions}
					placeholder={
						isLoading ? "Loading classrooms..." : "Select allowed classrooms"
					}
				/>

				<FormMultipleSelector
					control={control}
					name="departmentSubjectIds"
					label="Allowed subjects"
					options={subjectOptions}
					placeholder={
						isLoading ? "Loading subjects..." : "Select allowed subjects"
					}
				/>
			</div>

			<CustomSheetContentPortal>
				<div className="flex justify-end">
					<form
						onSubmit={handleSubmit((data) =>
							saveStaff.execute({
								...data,
								staffId: staffId ?? data.staffId,
							}),
						)}
					>
						<div className="flex">
							<SubmitButton size="sm" isSubmitting={saveStaff.isExecuting}>
								{submitLabel}
							</SubmitButton>
							{!staffId ? (
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
											if (!isValid) {
												toast.error("Invalid form");
												return;
											}

											saveStaff.execute({
												...getValues(),
											});
										}}
									>
										Save & new
									</Menu.Item>
								</Menu>
							) : null}
						</div>
					</form>
				</div>
			</CustomSheetContentPortal>
		</div>
	);
}
