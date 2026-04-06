"use client";

import { saveStaffAction } from "@/actions/save-staff";
import type { Option } from "@school-clerk/ui/multiple-selector";
import { useAction } from "next-safe-action/hooks";

import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useStaffParams } from "@/hooks/use-staff-params";
import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useFieldArray, useWatch } from "react-hook-form";

import { Button } from "@school-clerk/ui/button";
import { FormDescription } from "@school-clerk/ui/form";
import { Plus, Trash2 } from "lucide-react";

import FormInput from "../controls/form-input";
import FormMultipleSelector from "../controls/form-multiple-selector";
import FormSelect from "../controls/form-select";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useStaffFormContext } from "../staffs/form-context";
import { SubmitButton } from "../submit-button";

const ASSIGNMENT_ROLES = new Set(["Teacher"]);

type Props = {
	staffId?: string | null;
	submitLabel?: string;
	closeOnSuccess?: boolean;
};

function roleSupportsAssignments(role?: string | null) {
	return ASSIGNMENT_ROLES.has(role ?? "");
}

function OnboardingStatusBadge({
	status,
}: {
	status?: "NOT_SENT" | "PENDING" | "ACTIVE" | "FAILED";
}) {
	if (!status) return null;

	const styles = {
		NOT_SENT: "bg-muted text-muted-foreground",
		PENDING: "bg-amber-100 text-amber-900",
		ACTIVE: "bg-emerald-100 text-emerald-900",
		FAILED: "bg-red-100 text-red-900",
	}[status];

	const labels = {
		NOT_SENT: "Invite not sent",
		PENDING: "Pending onboarding",
		ACTIVE: "Active",
		FAILED: "Invite failed",
	}[status];

	return (
		<span
			className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}
		>
			{labels}
		</span>
	);
}

export function Form({
	staffId,
	submitLabel = "Save",
	closeOnSuccess = false,
}: Props) {
	const { setParams } = useStaffParams();
	const { control, handleSubmit, reset } = useStaffFormContext();
	const toast = useLoadingToast();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const role = useWatch({ control, name: "role" });
	const assignmentValues = useWatch({ control, name: "assignments" });
	const assignmentsFieldArray = useFieldArray({
		control,
		name: "assignments",
		keyName: "_id",
	});

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

	useEffect(() => {
		if (!roleSupportsAssignments(role) && assignmentsFieldArray.fields.length) {
			assignmentsFieldArray.replace([]);
		}
	}, [assignmentsFieldArray, role]);

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
				toast.error("Staff saved, but onboarding email could not be sent.");
			} else if (data.invited) {
				toast.success("Onboarding email sent.");
			} else {
				toast.success(staffId ? "Staff updated." : "Staff saved.");
			}

			if (closeOnSuccess) {
				setParams({ createStaff: null });
				reset();
			}
		},
		onError({ error }) {
			toast.error(error.serverError || "Could not save staff.");
		},
	});

	const classroomOptions = (formData?.classrooms ?? []) as Option[];

	return (
		<div className="flex flex-col gap-5">
			{staffId ? (
				<div className="rounded-xl border bg-muted/30 p-4">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-1">
							<p className="text-sm font-medium">Onboarding status</p>
							<p className="text-sm text-muted-foreground">
								Keep the invite current and update classroom access before the
								staff member completes onboarding.
							</p>
						</div>
						<OnboardingStatusBadge
							status={
								formData?.staff?.onboardingStatus as
									| "NOT_SENT"
									| "PENDING"
									| "ACTIVE"
									| "FAILED"
									| undefined
							}
						/>
					</div>
					{formData?.staff?.lastInviteError ? (
						<p className="mt-3 text-sm text-red-600">
							Last email issue: {formData.staff.lastInviteError}
						</p>
					) : null}
				</div>
			) : (
				<div className="rounded-xl border bg-muted/30 p-4">
					<p className="text-sm font-medium">Invite-first onboarding</p>
					<p className="mt-1 text-sm text-muted-foreground">
						Save an email, choose a role, assign classrooms and subjects, then
						School Clerk sends the onboarding link automatically.
					</p>
				</div>
			)}

			<div className="grid gap-4 md:grid-cols-2">
				<FormInput
					name="email"
					label="Staff email"
					placeholder="teacher@school.com"
					control={control}
					inputProps={{
						autoComplete: "email",
					}}
				/>
				<FormSelect
					name="role"
					label="Role"
					control={control}
					options={formData?.roles ?? []}
					placeholder="Select a role"
				/>
			</div>

			<div className="rounded-xl border p-4">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
					<div className="space-y-1">
						<p className="text-sm font-medium">Classroom and subject access</p>
						<p className="text-sm text-muted-foreground">
							Assignments are only enabled for teaching staff.
						</p>
					</div>
					{roleSupportsAssignments(role) ? (
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() =>
								assignmentsFieldArray.append({
									classRoomDepartmentId: "",
									departmentSubjectIds: [],
								})
							}
						>
							<Plus className="mr-2 h-4 w-4" />
							Add classroom
						</Button>
					) : null}
				</div>

				{roleSupportsAssignments(role) ? (
					<div className="mt-4 space-y-4">
						{assignmentsFieldArray.fields.length ? (
							assignmentsFieldArray.fields.map((field, index) => {
								const selectedClassroom =
									assignmentValues?.[index]?.classRoomDepartmentId;
								const subjectOptions = (formData?.subjectsByClassroom?.[
									selectedClassroom
								] ?? []) as Option[];

								return (
									<div
										key={field._id}
										className="rounded-xl border bg-background p-4"
									>
										<div className="flex items-center justify-between gap-3">
											<p className="text-sm font-medium">
												Assignment {index + 1}
											</p>
											<Button
												type="button"
												size="icon"
												variant="ghost"
												onClick={() => assignmentsFieldArray.remove(index)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>

										<div className="mt-4 grid gap-4">
											<FormSelect
												name={`assignments.${index}.classRoomDepartmentId`}
												label="Classroom"
												control={control}
												options={classroomOptions}
												placeholder={
													isLoading
														? "Loading classrooms..."
														: "Select classroom"
												}
											/>

											<FormMultipleSelector
												control={control}
												name={`assignments.${index}.departmentSubjectIds`}
												label="Subjects in this classroom"
												options={subjectOptions}
												placeholder={
													selectedClassroom
														? "Select subjects"
														: "Choose a classroom first"
												}
											/>
										</div>
									</div>
								);
							})
						) : (
							<div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
								Add one or more classroom assignments. Each classroom can have
								multiple subjects.
							</div>
						)}
						<FormDescription>
							Recommendation: keep classroom and subject assignment limited to
							the `Teacher` role for now. If `Admin` needs broad academic
							visibility later, add a separate all-classrooms permission rather
							than manual classroom assignment.
						</FormDescription>
					</div>
				) : (
					<div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
						This role does not require classroom or subject assignment.
					</div>
				)}
			</div>

			<CustomSheetContentPortal>
				<form
					onSubmit={handleSubmit((data) =>
						saveStaff.execute({
							...data,
							staffId: staffId ?? data.staffId,
						}),
					)}
				>
					<div className="flex justify-end">
						<SubmitButton size="sm" isSubmitting={saveStaff.isExecuting}>
							{submitLabel}
						</SubmitButton>
					</div>
				</form>
			</CustomSheetContentPortal>
		</div>
	);
}
