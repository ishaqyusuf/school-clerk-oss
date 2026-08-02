import { useEffect, useMemo, useState } from "react";

import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { FormDate } from "@school-clerk/ui/controls/form-date";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { FormSelect } from "@school-clerk/ui/controls/form-select";
import Sheet from "@school-clerk/ui/custom/sheet";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { canWriteFinance } from "@school-clerk/utils/constants";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { CollapseForm } from "../collapse-form";
import { useStudentFormContext } from "../students/form-context";

import { QuickFill } from "@/components/quick-fill";
import { useAuth } from "@/hooks/use-auth";
import { FindAndEnroll } from "../find-and-enroll";

const currencyFormatter = new Intl.NumberFormat("en-NG", {
	style: "currency",
	currency: "NGN",
	maximumFractionDigits: 2,
});

export function Form() {
	const { control, getValues, watch, setValue } = useStudentFormContext();
	const trpc = useTRPC();

	const { data: classList } = useQuery(
		trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
	);

	const mainClassrooms = useMemo(() => {
		if (!classList?.data) return [];
		const map = new Map<
			string,
			{
				id: string;
				name: string;
				studentCount: number;
				departments: typeof classList.data;
			}
		>();
		for (const dept of classList.data) {
			if (!dept.classRoom) continue;
			if (!map.has(dept.classRoom.id)) {
				map.set(dept.classRoom.id, {
					id: dept.classRoom.id,
					name: dept.classRoom.name || "",
					studentCount: 0,
					departments: [],
				});
			}
			map.get(dept.classRoom.id)!.departments.push(dept);
			// @ts-ignore - _count might not be typed fully in the router response type, but it is returned
			map.get(dept.classRoom.id)!.studentCount +=
				dept._count?.studentSessionForms || 0;
		}
		return Array.from(map.values());
	}, [classList?.data]);

	const [selectedMainClassId, setSelectedMainClassId] = useState<string>("");

	const handleMainClassChange = (mainClassId: string) => {
		setSelectedMainClassId(mainClassId);
		const mainClass = mainClassrooms.find((c) => c.id === mainClassId);
		if (mainClass?.departments.length === 1) {
			setValue("classRoomId", mainClass.departments[0].id, {
				shouldValidate: true,
				shouldDirty: true,
			});
		} else {
			setValue("classRoomId", null, {
				shouldValidate: true,
				shouldDirty: true,
			});
		}
	};

	const selectedMainClass = mainClassrooms.find(
		(c) => c.id === selectedMainClassId,
	);
	const showSubClassSelect =
		selectedMainClass && selectedMainClass.departments.length > 5;
	const showSubClassGrid =
		selectedMainClass &&
		selectedMainClass.departments.length > 1 &&
		selectedMainClass.departments.length <= 5;

	const auth = useAuth();
	const name = watch("name");
	const classRoomId = watch("classRoomId");
	const admissionType = watch("admissionType");
  const studentGender = watch("gender");
	const selectedOptionalFeeItemIds = watch("selectedOptionalFeeItemIds") ?? [];
	const feePayments = watch("feePayments") ?? [];
	const canReceivePayments = canWriteFinance(auth.role);

	useEffect(() => {
		if (classRoomId && classList?.data) {
			const dept = classList.data.find((d) => d.id === classRoomId);
			if (dept?.classRoom?.id && dept.classRoom.id !== selectedMainClassId) {
				setSelectedMainClassId(dept.classRoom.id);
			}
		}
	}, [classRoomId, classList?.data, selectedMainClassId]);

	const { data: applicableFeesPreview } = useQuery(
		trpc.academics.previewApplicableFeeHistories.queryOptions(
			{
				sessionTermId: auth?.profile?.termId || "",
				classroomDepartmentId: classRoomId || null,
				admissionType,
        studentGender,
			},
			{
        enabled: Boolean(auth?.profile?.termId && classRoomId && studentGender),
			},
		),
	);

	useEffect(() => {
		setValue("selectedOptionalFeeItemIds", []);
		setValue("feePayments", []);
  }, [admissionType, classRoomId, studentGender, setValue]);

	useEffect(() => {
		if (!applicableFeesPreview) return;

		const applicableFeeIds = new Set(
			applicableFeesPreview.map((fee) => fee.feeHistoryId),
		);
		const currentOptionalFeeItemIds =
			getValues("selectedOptionalFeeItemIds") ?? [];
		const applicableOptionalFeeItemIds = currentOptionalFeeItemIds.filter(
			(id) => applicableFeeIds.has(id),
		);
		if (
			applicableOptionalFeeItemIds.length !== currentOptionalFeeItemIds.length
		) {
			setValue("selectedOptionalFeeItemIds", applicableOptionalFeeItemIds);
		}

		const currentFeePayments = getValues("feePayments") ?? [];
		const applicableFeePayments = currentFeePayments.filter((payment) =>
			applicableFeeIds.has(payment.feeItemId),
		);
		if (applicableFeePayments.length !== currentFeePayments.length) {
			setValue("feePayments", applicableFeePayments);
		}
	}, [applicableFeesPreview, getValues, setValue]);

	const setFeePaymentAmount = (feeItemId: string, amount: number) => {
		const withoutFee = feePayments.filter(
			(payment) => payment.feeItemId !== feeItemId,
		);
		setValue(
			"feePayments",
			amount > 0 ? [...withoutFee, { feeItemId, amount }] : withoutFee,
			{ shouldDirty: true, shouldValidate: true },
		);
	};

	const includedFees = (applicableFeesPreview ?? []).filter(
		(fee) =>
			fee.collectable || selectedOptionalFeeItemIds.includes(fee.feeHistoryId),
	);
	const totalAssigned = includedFees.reduce((sum, fee) => sum + fee.amount, 0);
	const totalPayingNow = feePayments.reduce(
		(sum, payment) => sum + payment.amount,
		0,
	);
	const totalPending = Math.max(totalAssigned - totalPayingNow, 0);

	return (
		<div className="flex flex-col gap-4">
			{process.env.NODE_ENV !== "production" && (
				<div className="flex justify-between items-center">
					<h3 className="font-medium">Student Details</h3>
					<QuickFill name="student" args={{ mainClassrooms }} />
				</div>
			)}
			<FormInput name="name" label="First Name" control={control} />
			<FindAndEnroll query={name} />
			<div className="grid grid-cols-2 gap-4">
				<FormInput name="surname" label="Surname" control={control} />
				<FormInput name="otherName" label="Other Name" control={control} />
				<FormSelect
					name="gender"
					label="Gender"
					options={["Male", "Female"]}
					control={control}
				/>
				<FormDate
					control={control}
					dateFormat="dd MMM yyyy"
					label="Date of birth"
					name="dob"
					calendarProps={{
						disabled: { after: new Date() },
						endMonth: new Date(),
					}}
				/>
			</div>
			<FormSelect
				name="admissionType"
				label="Admission status for this term"
				options={[
					{ id: "UNCLASSIFIED", title: "Needs classification" },
					{ id: "NEW_ADMISSION", title: "New admission" },
					{ id: "RETURNING", title: "Returning student" },
				]}
				valueKey="id"
				titleKey="title"
				control={control}
			/>
			<div className="space-y-2">
				<Label>Classroom</Label>
				<Select
					value={selectedMainClassId}
					onValueChange={handleMainClassChange}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select Classroom" />
					</SelectTrigger>
					<SelectContent>
						{mainClassrooms.map((c) => (
							<SelectItem key={c.id} value={c.id}>
								{c.name} ({c.studentCount})
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			{showSubClassGrid && (
				<div className="space-y-2">
					<Label>Stream / Sub-class</Label>
					<div className="grid grid-cols-3 gap-4">
						{selectedMainClass!.departments.map((dept) => (
							<Button
								key={dept.id}
								type="button"
								variant={classRoomId === dept.id ? "default" : "outline"}
								onClick={() =>
									setValue("classRoomId", dept.id, {
										shouldValidate: true,
										shouldDirty: true,
									})
								}
								className="h-auto flex-col py-2"
							>
								<span>{dept.departmentName}</span>
								{/* @ts-ignore */}
								<span className="text-xs opacity-70 font-normal mt-1">
									{dept._count?.studentSessionForms || 0} students
								</span>
							</Button>
						))}
					</div>
					<input type="hidden" {...control.register("classRoomId")} />
				</div>
			)}
			{showSubClassSelect && (
				<FormSelect
					control={control}
					name="classRoomId"
					options={selectedMainClass!.departments.map((d) => ({
						...d,
						// @ts-ignore
						displayName: `${d.departmentName} (${d._count?.studentSessionForms || 0})`,
					}))}
					valueKey="id"
					label="Stream / Sub-class"
					titleKey="displayName"
				/>
			)}
			<div className="rounded-lg border border-border">
				<div className="border-b px-4 py-3">
					<h4 className="text-sm font-semibold">Fees & payments</h4>
					<p className="mt-1 text-xs text-muted-foreground">
						Required fees for the selected classroom are assigned automatically.
						Leave Pay now empty to keep a bill pending.
					</p>
				</div>

				<div className="space-y-3 p-3">
					{!classRoomId ? (
						<p className="px-1 py-3 text-sm text-muted-foreground">
							Select a classroom to see its preset fees.
						</p>
					) : !applicableFeesPreview?.length ? (
						<p className="px-1 py-3 text-sm text-muted-foreground">
							No active term fees match this classroom and admission status.
						</p>
					) : (
						applicableFeesPreview.map((fee) => {
							const isSelected =
								fee.collectable ||
								selectedOptionalFeeItemIds.includes(fee.feeHistoryId);
							const payNow =
								feePayments.find(
									(payment) => payment.feeItemId === fee.feeHistoryId,
								)?.amount ?? 0;
							const configuredAmount = fee.amount > 0;
							const remaining = Math.max(fee.amount - payNow, 0);

							return (
								<div
									key={fee.feeHistoryId}
									className="rounded-md border bg-background p-3"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="flex min-w-0 items-start gap-2">
											{!fee.collectable && (
												<Checkbox
													className="mt-0.5"
													checked={isSelected}
													onCheckedChange={(checked) => {
														const next = checked
															? Array.from(
																	new Set([
																		...selectedOptionalFeeItemIds,
																		fee.feeHistoryId,
																	]),
																)
															: selectedOptionalFeeItemIds.filter(
																	(id) => id !== fee.feeHistoryId,
																);
														setValue("selectedOptionalFeeItemIds", next, {
															shouldDirty: true,
														});
														if (!checked) {
															setFeePaymentAmount(fee.feeHistoryId, 0);
														}
													}}
													aria-label={`Add ${fee.title}`}
												/>
											)}
											<div className="min-w-0">
												<div className="flex flex-wrap items-center gap-2">
													<span className="text-sm font-medium">
														{fee.title}
													</span>
													<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
														{fee.collectable ? "Required" : "Optional"}
													</span>
												</div>
												<p className="mt-1 text-xs text-muted-foreground">
													{fee.streamName || "Unassigned stream"} • {fee.scope}
												</p>
											</div>
										</div>
										<div className="shrink-0 text-right">
											<p className="text-xs text-muted-foreground">Due</p>
											<p className="text-sm font-semibold">
												{configuredAmount
													? currencyFormatter.format(fee.amount)
													: "Not configured"}
											</p>
										</div>
									</div>

									{isSelected && configuredAmount && canReceivePayments && (
										<div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-[1fr_auto]">
											<div className="space-y-1">
												<Label htmlFor={`pay-now-${fee.feeHistoryId}`}>
													Pay now
												</Label>
												<Input
													id={`pay-now-${fee.feeHistoryId}`}
													type="number"
													min={0}
													max={fee.amount}
													step="0.01"
													placeholder="0.00"
													value={payNow || ""}
													onChange={(event) => {
														const nextAmount = Number(event.target.value || 0);
														setFeePaymentAmount(
															fee.feeHistoryId,
															Math.min(Math.max(nextAmount, 0), fee.amount),
														);
													}}
												/>
											</div>
											<Button
												className="self-end"
												type="button"
												variant="outline"
												onClick={() =>
													setFeePaymentAmount(fee.feeHistoryId, fee.amount)
												}
											>
												Pay full
											</Button>
										</div>
									)}

									{isSelected && (
										<p className="mt-2 text-xs text-muted-foreground">
											{payNow >= fee.amount && configuredAmount
												? "Paid after saving"
												: payNow > 0
													? `${currencyFormatter.format(remaining)} remains pending after saving`
													: configuredAmount
														? `${currencyFormatter.format(fee.amount)} remains pending after saving`
														: "Set the fee amount in Finance before collecting payment."}
										</p>
									)}
								</div>
							);
						})
					)}
				</div>

				{totalPayingNow > 0 && canReceivePayments && (
					<div className="grid grid-cols-2 gap-4 border-t p-4">
						<FormSelect
							control={control}
							name="paymentDetails.method"
							options={[
								{ id: "CASH", title: "Cash" },
								{ id: "TRANSFER", title: "Bank Transfer" },
								{ id: "POS", title: "POS / Card" },
							]}
							valueKey="id"
							label="Payment Method"
							titleKey="title"
						/>
						<FormDate
							control={control}
							label="Payment Date"
							name="paymentDetails.paymentDate"
						/>
						<div className="col-span-2">
							<FormInput
								name="paymentDetails.reference"
								label="Payment Reference (Optional)"
								control={control}
							/>
						</div>
					</div>
				)}

				{includedFees.length > 0 && (
					<div className="grid grid-cols-3 gap-2 border-t bg-muted/30 px-4 py-3 text-xs">
						<div>
							<p className="text-muted-foreground">Assigned</p>
							<p className="mt-0.5 font-semibold">
								{currencyFormatter.format(totalAssigned)}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground">Paying now</p>
							<p className="mt-0.5 font-semibold text-emerald-600">
								{currencyFormatter.format(totalPayingNow)}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground">Pending</p>
							<p className="mt-0.5 font-semibold">
								{currencyFormatter.format(totalPending)}
							</p>
						</div>
					</div>
				)}

				{!canReceivePayments && includedFees.length > 0 && (
					<p className="border-t px-4 py-3 text-xs text-muted-foreground">
						These bills will be assigned when the student is created. An admin
						or accountant can record payment.
					</p>
				)}
			</div>

			<div className="">
				<CollapseForm label="Parent">
					<FormInput name="guardian.name" label="Name" control={control} />
					<div className="grid grid-cols-2 gap-4">
						<FormInput
							name="guardian.phone"
							label="Phone"
							type="phone"
							control={control}
						/>
						<FormInput
							name="guardian.phone2"
							type="phone"
							label="Phone 2"
							control={control}
						/>
					</div>
				</CollapseForm>
			</div>
			<Sheet.Content>
				<div className="flex flex-col">
					{/* {!data || (
            <div className="flex my-4">
              <div className="">
                <span>{formatStudentName(data as any)}</span>
              </div>
              <div className="flex-1"></div>
              <Button
                onClick={(e) => {
                  setParams({
                    studentViewId: data.id,
                    studentViewTermId: auth?.profile?.termId,
                    createStudent: null,
                  });
                }}
              >
                View
              </Button>
            </div>
          )} */}
				</div>
			</Sheet.Content>
		</div>
	);
}
