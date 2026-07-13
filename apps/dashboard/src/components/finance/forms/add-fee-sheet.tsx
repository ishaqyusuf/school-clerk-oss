"use client";

import { useAddFeeParams } from "@/hooks/use-add-fee-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import FormMultipleSelector from "@/components/controls/form-multiple-selector";
import { Form } from "@school-clerk/ui/form";
import { Label } from "@school-clerk/ui/label";
import { ConfirmBtn } from "@school-clerk/ui/confirm-button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@school-clerk/ui/sheet";
import { toast } from "@school-clerk/ui/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useFieldArray } from "react-hook-form";
import { z } from "zod";

const addFeeSchema = z.object({
	scope: z.enum(["global", "classroom", "student"]),
	classroomIds: z.array(z.string()).default([]),
	streamId: z.string().nullable().optional(),
	streamName: z.string().min(1, "Fee title is required"),
	required: z.boolean().default(true),
	lines: z
		.array(
			z.object({
				description: z.string().min(1, "Description is required"),
				amount: z.coerce.number().min(0, "Amount must be a positive number"),
			}),
		)
		.min(1, "At least one sub-fee is required"),
});

export function AddFeeSheet() {
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

	const form = useZodForm(addFeeSchema, {
		defaultValues: {
			scope: addFeeStudentId ? "student" : addFeeClassroomId ? "classroom" : "global",
			classroomIds: addFeeClassroomId ? [addFeeClassroomId] : [],
			streamId: null,
			streamName: addFeeTitle ?? "",
			required: true,
			lines: [{ description: addFeeTitle ?? "", amount: 0 }],
		},
	});

	const scope = form.watch("scope");
	const streamName = form.watch("streamName");

	useEffect(() => {
		if (isOpen) {
			form.reset({
				scope: addFeeStudentId ? "student" : addFeeClassroomId ? "classroom" : "global",
				classroomIds: addFeeClassroomId ? [addFeeClassroomId] : [],
				streamId: null,
				streamName: addFeeTitle ?? "",
				required: true,
				lines: [{ description: addFeeTitle ?? "", amount: 0 }],
			});
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

	const createItem = useMutation(
		trpc.finance.createItem.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
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
						queryKey: trpc.finance.getStudentPayments.queryKey(),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getReceivePaymentData.queryKey(),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getStudentPurchaseSuggestions.queryKey(),
					}),
				]);
				toast({
					title: "Fee added successfully",
					variant: "success",
				});
				setParams({
					addFee: null,
					addFeeClassroomId: null,
					addFeeStudentId: null,
					addFeeStudentTermFormId: null,
					addFeeTitle: null,
				});
			},
			onError: (error) => {
				toast({
					title: "Error adding fee",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const createCharge = useMutation(
		trpc.finance.createCharge.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
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
				]);
				toast({
					title: "Student fee added successfully",
					variant: "success",
				});
				setParams({
					addFee: null,
					addFeeClassroomId: null,
					addFeeStudentId: null,
					addFeeStudentTermFormId: null,
					addFeeTitle: null,
				});
			},
			onError: (error) => {
				toast({
					title: "Error adding student fee",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

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

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "lines",
	});

	const onSubmit = form.handleSubmit(async (data) => {
		let classRoomDepartmentIds: string[] = [];

		// Check if classrooms is an array, else check if it has data property
		const classList = Array.isArray(classrooms) ? classrooms : classrooms?.data || [];

		if (data.scope === "classroom" && data.classroomIds?.length) {
			const targetClasses = classList.filter((c: any) => data.classroomIds.includes(c.id));
			if (targetClasses.length) {
				classRoomDepartmentIds = targetClasses.map((c: any) => c.id);
			}
		}

		// Because we're making multiple requests (one per line item),
		// we should collect them in a Promise.all.
		try {
			if (data.scope === "student") {
				if (!addFeeStudentId) {
					toast({
						title: "Student is required",
						description: "Select a student before creating a student-only fee.",
						variant: "destructive",
					});
					return;
				}

				await Promise.all(
					data.lines.map((line) =>
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
							collectionStatus: data.required
								? "NOT_COLLECTED"
								: "NOT_REQUIRED",
							dueDate: null,
						}),
					),
				);
				return;
			}

			await Promise.all(
				data.lines.map((line) =>
					createItem.mutateAsync({
						streamId: data.streamId,
						streamName: data.streamName,
						name: line.description,
						description: line.description,
						amount: line.amount,
						collectable: data.required,
						classRoomDepartmentIds,
					}),
				),
			);
		} catch (error) {
			// error is handled by mutation onError
		}
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
		<Sheet
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					setParams({
						addFee: null,
						addFeeClassroomId: null,
						addFeeStudentId: null,
						addFeeStudentTermFormId: null,
						addFeeTitle: null,
					});
				}
			}}
		>
			<SheetContent className="w-full overflow-y-auto sm:max-w-xl">
				<SheetHeader>
					<SheetTitle>Add Fee</SheetTitle>
				</SheetHeader>

				<Form {...form}>
					<form onSubmit={onSubmit} className="mt-6 space-y-6">
					<div className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label>Scope</Label>
								<Select
									value={scope}
									onValueChange={(value: "global" | "classroom" | "student") =>
										form.setValue("scope", value)
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{addFeeStudentId ? (
											<SelectItem value="student">Selected Student</SelectItem>
										) : null}
										<SelectItem value="global">Global (All Classes)</SelectItem>
										<SelectItem value="classroom">Specific Classroom</SelectItem>
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
										options={(Array.isArray(classrooms) ? classrooms : classrooms?.data || []).map((cls: any) => ({
											value: cls.id,
											label: cls.displayName || cls.name,
										}))}
									/>
								</div>
							)}
						</div>

						<div className="rounded-lg border p-4 shadow-sm bg-muted/20">
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
										const watchedDesc = form.watch(`lines.${index}.description`);
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
												className="flex flex-col gap-3 md:flex-row md:items-start"
											>
												<div className="grid gap-2 md:w-1/5">
													{index === 0 ? <Label>Fee Type</Label> : null}
													{index === 0 ? (
														<Select
															value={
																form.watch("required") ? "required" : "optional"
															}
															onValueChange={(value) => {
																form.setValue("required", value === "required");
															}}
														>
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="required">Required</SelectItem>
																<SelectItem value="optional">Optional</SelectItem>
															</SelectContent>
														</Select>
													) : (
														<div className="hidden h-10 md:block" />
													)}
												</div>
												<div className="grid gap-2 md:w-full">
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
													{form.formState.errors.lines?.[index]?.description && (
														<p className="text-[0.8rem] font-medium text-destructive">
															{
																form.formState.errors.lines[index]?.description
																	?.message
															}
														</p>
													)}
												</div>
												<div className="grid gap-2 md:w-1/4">
													{index === 0 ? <Label>Amount</Label> : null}
													<FormInput
														name={`lines.${index}.amount`}
														control={form.control}
														numericProps={{
															prefix: "NGN ",
															placeholder: "NGN 0",
															thousandSeparator: true,
														}}
													/>
												</div>
												{fields.length > 1 && (
													<div className="flex items-end pt-8 md:pt-0">
														<ConfirmBtn
															trash
															onClick={() => remove(index)}
															className={index === 0 ? "md:mt-8" : ""}
														/>
													</div>
												)}
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
											append({ description: "", amount: 0 });
										}}
									>
										Add Sub Fee
									</Button>
								</div>
							</div>
						</div>
					</div>

					<div className="flex justify-end gap-3 pt-4 border-t">
						<Button
							type="button"
							variant="outline"
							onClick={() => setParams({ addFee: null })}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={createItem.isPending}
							className="min-w-[120px]"
						>
							{createItem.isPending ? "Adding..." : "Add Fee"}
						</Button>
					</div>
				</form>
				</Form>
			</SheetContent>
		</Sheet>
	);
}
