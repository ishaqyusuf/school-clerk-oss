"use client";

import FormMultipleSelector from "@/components/controls/form-multiple-selector";
import { useAddFeeParams } from "@/hooks/use-add-fee-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { Button } from "@school-clerk/ui/button";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { ConfirmBtn } from "@school-clerk/ui/confirm-button";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@school-clerk/ui/dialog";
import { Form } from "@school-clerk/ui/form";
import { Label } from "@school-clerk/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { toast } from "@school-clerk/ui/use-toast";
import {
  FINANCE_STUDENT_AUDIENCES,
  FINANCE_STUDENT_GENDER_AUDIENCES,
} from "@school-clerk/utils/constants";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useFieldArray } from "react-hook-form";
import { z } from "zod";
import {
	buildFeeItemPayloads,
	closedAddFeeParams,
	feeAudienceOptions,
  feeGenderAudienceOptions,
	getAddFeeDefaultValues,
	getFeeAssignmentSummary,
	getFeeScopeError,
	normalizeFeeLines,
	resolveFeeClassroomIds,
	summarizeFeeBatch,
} from "../finance/forms/add-fee-model";

const addFeeSchema = z
	.object({
		scope: z.enum(["global", "classroom", "student"]),
		classroomIds: z.array(z.string()).default([]),
		streamId: z.string().nullable().optional(),
		streamName: z.string().min(1, "Fee title is required"),
		required: z.boolean().default(true),
		studentAudience: z.enum(FINANCE_STUDENT_AUDIENCES).default("ALL_STUDENTS"),
    studentGenderAudience: z
      .enum(FINANCE_STUDENT_GENDER_AUDIENCES)
      .default("ALL_GENDERS"),
		lines: z
			.array(
				z.object({
					description: z.string().min(1, "Description is required"),
					amount: z.coerce.number().min(0, "Amount must be a positive number"),
          studentGenderAudience: z
            .enum(FINANCE_STUDENT_GENDER_AUDIENCES)
            .nullable()
            .default(null),
				}),
			)
			.min(1, "At least one sub-fee is required"),
	})
	.superRefine((data, ctx) => {
		const scopeError = getFeeScopeError(data);
		if (scopeError) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["classroomIds"],
				message: scopeError,
			});
		}
	});

type ClassroomOption = {
	id: string;
	displayName?: string | null;
	name?: string | null;
};

export function AddFeeModal() {
	const {
		addFee,
		addFeeClassroomId,
		addFeeStudentId,
		addFeeStudentTermFormId,
		addFeeTitle,
		setParams,
	} = useAddFeeParams();
	const isOpen = Boolean(addFee);
	const trpc = useTRPC();
	const qc = useQueryClient();
	const closeModal = () => setParams(closedAddFeeParams);

	const form = useZodForm(addFeeSchema, {
		defaultValues: getAddFeeDefaultValues({
			classroomId: addFeeClassroomId,
			studentId: addFeeStudentId,
			title: addFeeTitle,
		}),
	});

	const scope = form.watch("scope");
	const streamName = form.watch("streamName");
	const required = form.watch("required");
	const studentAudience = form.watch("studentAudience");
  const studentGenderAudience = form.watch("studentGenderAudience");

	useEffect(() => {
		if (isOpen) {
			form.reset(
				getAddFeeDefaultValues({
					classroomId: addFeeClassroomId,
					studentId: addFeeStudentId,
					title: addFeeTitle,
				}),
			);
		}
	}, [isOpen, addFeeClassroomId, addFeeStudentId, addFeeTitle, form]);

	const { data: streams = [] } = useQuery(
		trpc.finance.getStreams.queryOptions(
			{ filter: "term" },
			{ enabled: isOpen },
		),
	);
	const { data: financeItems = [] } = useQuery(
		trpc.finance.getItems.queryOptions(undefined, { enabled: isOpen }),
	);
	const { data: classrooms = [] } = useQuery(
		trpc.classrooms.getCurrentSessionClassroom.queryOptions(undefined, {
			enabled: isOpen,
		}),
	);
	const classroomOptions = useMemo(
		() =>
			(Array.isArray(classrooms)
				? classrooms
				: classrooms?.data || []) as ClassroomOption[],
		[classrooms],
	);

	const createItem = useMutation(trpc.finance.createItem.mutationOptions());
	const createCharge = useMutation(trpc.finance.createCharge.mutationOptions());

	const invalidateItemQueries = () =>
		Promise.all([
			qc.invalidateQueries({
				queryKey: trpc.finance.getItems.queryKey(),
			}),
			qc.invalidateQueries({
				queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
			}),
			qc.invalidateQueries({
				queryKey: trpc.finance.overview.queryKey(),
			}),
			qc.invalidateQueries({
				queryKey: trpc.finance.getWorkspaceSummary.queryKey(),
			}),
			qc.invalidateQueries({
				queryKey: trpc.finance.getAccounts.queryKey(),
			}),
			qc.invalidateQueries({
				queryKey: trpc.finance.getStudentPayments.queryKey(),
			}),
			qc.invalidateQueries({
				queryKey: trpc.finance.getReceivePaymentData.queryKey(),
			}),
			qc.invalidateQueries({
				queryKey: trpc.finance.getStudentPurchaseSuggestions.queryKey(),
			}),
		]);

	const invalidateChargeQueries = () =>
		Promise.all([
			qc.invalidateQueries({
				queryKey: trpc.finance.getCharges.queryKey(),
			}),
			qc.invalidateQueries({
				queryKey: trpc.finance.getReceivePaymentData.queryKey(),
			}),
			qc.invalidateQueries({
				queryKey: trpc.finance.getReceivePaymentOptions.queryKey(),
			}),
			qc.invalidateQueries({
				queryKey: trpc.finance.overview.queryKey(),
			}),
			qc.invalidateQueries({
				queryKey: trpc.finance.getWorkspaceSummary.queryKey(),
			}),
			qc.invalidateQueries({
				queryKey: trpc.finance.getAccounts.queryKey(),
			}),
		]);

	const feeTitleOptions = useMemo(() => {
		const options = new Map<
			string,
			{ id: string; label: string; streamId?: string }
		>();

		for (const title of [
			"PTA Levy",
			"Exam Fee",
			"Development Levy",
			"ID Card",
			"Portal Fee",
			"Tuition Fee",
			"Books",
			"Uniform",
		]) {
			options.set(title.toLowerCase(), { id: `preset:${title}`, label: title });
		}

		for (const stream of streams) {
			options.set(stream.name.toLowerCase(), {
				id: stream.id,
				label: stream.name,
				streamId: stream.id,
			});
		}

		for (const item of financeItems) {
			const title = item.streamName || item.name;
			if (!title) continue;

			options.set(title.toLowerCase(), {
				id: `item:${title}`,
				label: title,
				streamId: item.streamId ?? undefined,
			});
		}

		return Array.from(options.values());
	}, [financeItems, streams]);

	const getDescriptionOptions = (feeTitle?: string | null) => {
		const normalizedTitle = feeTitle?.trim().toLowerCase();
		const options = new Map<string, { id: string; label: string }>();
		const presets: Record<string, string[]> = {
			"pta levy": ["PTA Levy"],
			"exam fee": ["Midterm Assessment", "Final Assessment"],
			"development levy": ["Development Levy"],
			"id card": ["ID Card"],
			"portal fee": ["Portal Fee"],
			"tuition fee": ["Basic Tuition Fee"],
			books: ["Text Books", "Exercise Books", "Notes"],
			uniform: ["School Uniform", "Sport Wear", "Cardigan", "Customs"],
		};

		if (normalizedTitle && presets[normalizedTitle]) {
			for (const desc of presets[normalizedTitle]) {
				options.set(desc.toLowerCase(), { id: `preset:${desc}`, label: desc });
			}
		}

		for (const item of financeItems) {
			if (
				(item.streamName || item.name)?.trim().toLowerCase() ===
					normalizedTitle &&
				item.description
			) {
				options.set(item.description.toLowerCase(), {
					id: `item:${item.description}`,
					label: item.description,
				});
			}
		}

		return Array.from(options.values());
	};

	const { fields, append, remove, replace } = useFieldArray({
		control: form.control,
		name: "lines",
	});

	const onSubmit = form.handleSubmit(async (data) => {
		let classRoomDepartmentIds: string[] = [];
		const feeLines = normalizeFeeLines(data.lines);

		const classroomResolution = resolveFeeClassroomIds({
			scope: data.scope ?? "global",
			selectedIds: data.classroomIds ?? [],
			availableIds: classroomOptions.map((classroom) => classroom.id),
		});
		if (classroomResolution.error) {
			toast({
				title: "Classroom selection is no longer available",
				description: classroomResolution.error,
				variant: "destructive",
			});
			return;
		}
		classRoomDepartmentIds = classroomResolution.ids;

		if (data.scope === "student") {
			if (!addFeeStudentId) {
				toast({
					title: "Student is required",
					description: "Select a student before creating a student-only fee.",
					variant: "destructive",
				});
				return;
			}

			const results = await Promise.allSettled(
				feeLines.map((line) =>
					createCharge.mutateAsync({
						itemId: null,
						streamId: data.streamId,
						streamName: data.streamName,
						type: "OTHER",
						payerType: "STUDENT",
						studentId: addFeeStudentId,
						studentTermFormId: addFeeStudentTermFormId,
						staffProfileId: null,
						staffTermProfileId: null,
						payeeId: null,
						payrollStructureId: null,
						classroomDepartmentId: addFeeClassroomId,
						sessionId: null,
						termId: null,
						title: line.description || data.streamName,
						description: line.description,
						amount: line.amount,
						collectionStatus: data.required ? "NOT_COLLECTED" : "NOT_REQUIRED",
						dueDate: null,
					}),
				),
			);
			const summary = summarizeFeeBatch(feeLines, results);
			if (summary.succeededCount > 0) await invalidateChargeQueries();
			if (summary.failedLines.length > 0) {
				replace(summary.failedLines);
				toast({
					title:
						summary.succeededCount > 0
							? "Some student fee lines were not added"
							: "Error adding student fee",
					description:
						summary.succeededCount > 0
							? `${summary.succeededCount} added. Retry the remaining ${summary.failedLines.length}.`
							: summary.firstErrorMessage,
					variant: "destructive",
				});
				return;
			}

			toast({ title: "Student fee added successfully", variant: "success" });
			closeModal();
			return;
		}

		const payloads = buildFeeItemPayloads({
			streamId: data.streamId,
			streamName: data.streamName ?? "",
			required: data.required ?? true,
			studentAudience: data.studentAudience ?? "ALL_STUDENTS",
      studentGenderAudience: data.studentGenderAudience ?? "ALL_GENDERS",
			lines: feeLines,
			classRoomDepartmentIds,
		});
		const results = await Promise.allSettled(
			payloads.map((payload) => createItem.mutateAsync(payload)),
		);
		const summary = summarizeFeeBatch(feeLines, results);
		if (summary.succeededCount > 0) await invalidateItemQueries();
		if (summary.failedLines.length > 0) {
			replace(summary.failedLines);
			toast({
				title:
					summary.succeededCount > 0
						? "Some fee lines were not added"
						: "Error adding fee",
				description:
					summary.succeededCount > 0
						? `${summary.succeededCount} added. Retry the remaining ${summary.failedLines.length}.`
						: summary.firstErrorMessage,
				variant: "destructive",
			});
			return;
		}

		toast({ title: "Fee added successfully", variant: "success" });
		closeModal();
	});

	const selectedFeeTitle =
		feeTitleOptions.find((option) => option.label === streamName) ||
		(streamName
			? {
					id: `current:${streamName}`,
					label: streamName,
				}
			: undefined);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !form.formState.isSubmitting) closeModal();
			}}
		>
			<DialogContent
				className="max-h-[85vh] max-w-[560px] overflow-y-auto p-0"
				onOpenAutoFocus={(event) => event.preventDefault()}
			>
				<div className="p-6">
					<DialogHeader className="mb-6">
						<DialogTitle>
							{scope === "student" ? "Add student fee" : "Add fee"}
						</DialogTitle>
						<DialogDescription>
							{scope === "student"
								? "Add a direct charge for the selected student."
								: "Create a reusable fee and control who receives it during enrollment."}
						</DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<form onSubmit={onSubmit} className="space-y-6">
							<div className="space-y-4">
								<div className="grid gap-4 sm:grid-cols-2">
									<div
										className={
											scope === "classroom"
												? "space-y-2"
												: "space-y-2 sm:col-span-2"
										}
									>
										<Label>Scope</Label>
										<Select
											value={scope}
											onValueChange={(
												value: "global" | "classroom" | "student",
											) => form.setValue("scope", value)}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{addFeeStudentId ? (
													<SelectItem value="student">
														Selected Student
													</SelectItem>
												) : null}
												<SelectItem value="global">
													Global (All Classes)
												</SelectItem>
												<SelectItem value="classroom">
													Specific Classroom
												</SelectItem>
											</SelectContent>
										</Select>
									</div>

									{scope === "classroom" && (
										<div className="space-y-2">
											<FormMultipleSelector
												name="classroomIds"
												control={form.control}
												label="Classrooms"
												placeholder="Select classrooms"
												options={classroomOptions.map((cls) => ({
													value: cls.id,
													label: cls.displayName || cls.name,
												}))}
											/>
										</div>
									)}
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div className="space-y-2">
										<Label>Assignment</Label>
										<Select
											value={required ? "required" : "optional"}
											onValueChange={(value) =>
												form.setValue("required", value === "required")
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="required">Required</SelectItem>
												<SelectItem value="optional">Optional</SelectItem>
											</SelectContent>
										</Select>
										<p className="text-xs text-muted-foreground">
											{required
												? "Assigned automatically to matching enrollments."
												: "Shown in the student form for selection when needed."}
										</p>
									</div>

									{scope !== "student" ? (
										<div className="space-y-2">
											<Label>Student audience</Label>
											<Select
												value={studentAudience}
												onValueChange={(value) =>
													form.setValue(
														"studentAudience",
														value as (typeof FINANCE_STUDENT_AUDIENCES)[number],
													)
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{feeAudienceOptions.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															{option.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<p className="text-xs text-muted-foreground">
												Controls which enrollment type can receive this fee.
											</p>
										</div>
									) : null}
								</div>

                {scope !== "student" ? (
                  <div className="space-y-2">
                    <Label>Default gender</Label>
                    <Select
                      value={studentGenderAudience}
                      onValueChange={(value) =>
                        form.setValue(
                          "studentGenderAudience",
                          value as (typeof FINANCE_STUDENT_GENDER_AUDIENCES)[number],
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {feeGenderAudienceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Applied to every sub-fee unless that line overrides it.
                    </p>
                  </div>
                ) : null}

								{scope !== "student" ? (
									<div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
										{getFeeAssignmentSummary({
											audience: studentAudience,
                      genderAudience: studentGenderAudience,
											required,
										})}
									</div>
								) : null}

								<div>
									<div className="grid gap-4">
										<div className="grid gap-2">
											<Label>Fee Title (Stream)</Label>
											<ComboboxDropdown
												items={feeTitleOptions}
												selectedItem={selectedFeeTitle}
												placeholder="Select or create a fee title"
												searchPlaceholder="Search or create fee title..."
												onSelect={(stream) => {
													form.setValue("streamId", stream.streamId ?? null);
													form.setValue("streamName", stream.label);
												}}
												onCreate={(value) => {
													form.setValue("streamId", null);
													form.setValue("streamName", value.trim());
												}}
												renderOnCreate={(value) => (
													<span>Create new fee title "{value}"</span>
												)}
											/>
											{form.formState.errors.streamName && (
												<p className="text-[0.8rem] font-medium text-destructive">
													{form.formState.errors.streamName.message}
												</p>
											)}
										</div>

										<div className="grid gap-2">
											{fields.map((line, index) => {
												const descriptionOptions =
													getDescriptionOptions(streamName);
												const watchedDesc = form.watch(
													`lines.${index}.description`,
												);
                        const lineGenderAudience = form.watch(
                          `lines.${index}.studentGenderAudience`,
                        );
                        const defaultGenderLabel =
                          feeGenderAudienceOptions.find(
                            (option) => option.value === studentGenderAudience,
                          )?.label ?? "main fee";
                        const lineGenderCode =
                          lineGenderAudience === "MALE_ONLY"
                            ? "M"
                            : lineGenderAudience === "FEMALE_ONLY"
                              ? "F"
                              : lineGenderAudience === "ALL_GENDERS"
                                ? "All"
                                : "Auto";
												const selectedDescription =
													descriptionOptions.find(
														(option) => option.label === watchedDesc,
													) ||
													(watchedDesc
														? {
																id: `current:${watchedDesc}`,
																label: watchedDesc,
															}
														: undefined);

												return (
													<div
														key={line.id}
                            className={
                              scope === "student"
                                ? "grid grid-cols-[minmax(0,1fr)_28px] items-start gap-2 border-t pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_110px_28px]"
                                : "grid grid-cols-[64px_minmax(0,1fr)_28px] items-start gap-2 border-t pt-4 first:border-t-0 first:pt-0 sm:grid-cols-[64px_minmax(0,1fr)_110px_28px]"
                            }
													>
                            <div
                              className={
                                scope === "student"
                                  ? "hidden"
                                  : "grid min-w-0 gap-2"
                              }
                            >
                              {index === 0 ? <Label>Gender</Label> : null}
                              <Select
                                value={lineGenderAudience ?? "INHERIT"}
                                onValueChange={(value) =>
                                  form.setValue(
                                    `lines.${index}.studentGenderAudience`,
                                    value === "INHERIT"
                                      ? null
                                      : (value as (typeof FINANCE_STUDENT_GENDER_AUDIENCES)[number]),
                                  )
                                }
                              >
                                <SelectTrigger className="px-2">
                                  <SelectValue>{lineGenderCode}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="INHERIT" textValue="Auto">
                                    Use default ({defaultGenderLabel})
                                  </SelectItem>
                                  <SelectItem
                                    value="ALL_GENDERS"
                                    textValue="All"
                                  >
                                    All genders
                                  </SelectItem>
                                  <SelectItem value="MALE_ONLY" textValue="M">
                                    Male students only
                                  </SelectItem>
                                  <SelectItem value="FEMALE_ONLY" textValue="F">
                                    Female students only
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid min-w-0 gap-2 overflow-hidden [&>button]:max-w-full [&>button]:min-w-0">
															{index === 0 ? <Label>Description</Label> : null}
															<ComboboxDropdown
																items={descriptionOptions}
																selectedItem={selectedDescription}
																placeholder="Select or create description"
																searchPlaceholder="Search or create description..."
																onSelect={(description) => {
																	form.setValue(
																		`lines.${index}.description`,
																		description.label,
																	);
																}}
																onCreate={(value) => {
																	form.setValue(
																		`lines.${index}.description`,
																		value.trim(),
																	);
																}}
																renderOnCreate={(value) => (
																	<span>Create description "{value}"</span>
																)}
															/>
															{form.formState.errors.lines?.[index]
																?.description && (
																<p className="text-[0.8rem] font-medium text-destructive">
																	{
																		form.formState.errors.lines[index]
																			?.description?.message
																	}
																</p>
															)}
														</div>
                            <div
                              className={
                                scope === "student"
                                  ? "col-span-2 row-start-2 mt-1 grid min-w-0 gap-2 [&>div]:mx-0 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mt-0"
                                  : "col-span-3 row-start-2 mt-1 grid min-w-0 gap-2 [&>div]:mx-0 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:mt-0"
                              }
                            >
															{index === 0 ? <Label>Amount</Label> : null}
															<FormInput
																name={`lines.${index}.amount`}
																control={form.control}
																numericProps={{
                                  prefix: "₦ ",
                                  placeholder: "0",
																	thousandSeparator: true,
																}}
															/>
														</div>
                            <div
                              className={`${scope === "student" ? "col-start-2 sm:col-start-3" : "col-start-3 sm:col-start-4"} row-start-1 ${index === 0 ? "pt-7" : ""}`}
                            >
                              {fields.length > 1 ? (
																<ConfirmBtn
																	trash
                                  size="xs"
																	onClick={() => remove(index)}
																/>
                              ) : null}
															</div>
													</div>
												);
											})}
										</div>

										<div className="flex justify-end">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => {
                          append({
                            description: "",
                            amount: 0,
                            studentGenderAudience: null,
                          });
												}}
											>
												Add Sub Fee
											</Button>
										</div>
									</div>
								</div>
							</div>

							<DialogFooter className="border-t pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={closeModal}
									disabled={form.formState.isSubmitting}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={form.formState.isSubmitting}
									className="min-w-[120px]"
								>
									{form.formState.isSubmitting ? "Adding..." : "Add fee"}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
