"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
	AlertTriangle,
	BookOpen,
	Calendar,
	CheckCircle2,
	CreditCard,
	Plus,
	Search,
	Trash2,
	UserPlus,
	Wand2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AddFeeSheet } from "@/components/finance/forms/add-fee-sheet";
import { useStudentNameFormatter } from "@/components/student-name-format/provider";
import { useAddFeeParams } from "@/hooks/use-add-fee-params";
import { useReceivePaymentParams } from "@/hooks/use-receive-payment-params";
import { useStudentParams } from "@/hooks/use-student-params";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@school-clerk/ui/alert";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Card, CardContent } from "@school-clerk/ui/card";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { cn } from "@school-clerk/ui/cn";
import { ComboboxDropdown } from "@school-clerk/ui/combobox-dropdown";
import { Input } from "@school-clerk/ui/input";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemFooter,
	ItemGroup,
	ItemHeader,
	ItemTitle,
} from "@school-clerk/ui/item";
import { Label } from "@school-clerk/ui/label";
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

type SelectionState = Record<string, { selected: boolean; amount: string }>;

type ReceiptState = {
	paymentIds: string[];
	count: number;
	totalAllocated: number;
};

type StreamOption = {
	id: string;
	label: string;
	name: string;
	type?: string | null;
	defaultType?: string | null;
};

type PayableRow = {
	key: string;
	source: "studentFee" | "feeHistory" | "manual" | "billable";
	studentTermFormId: string;
	studentFeeId?: string | null;
	billableHistoryId?: string | null;
	feeHistoryId?: string | null;
	title: string;
	description?: string | null;
	amount: number;
	paidAmount?: number;
	pendingAmount: number;
	status: "PAID" | "PARTIAL" | "PENDING" | "UNAPPLIED" | "NEW";
	streamId?: string | null;
	streamName?: string | null;
	classroomNames?: string[];
};

type TermData = {
	id: string;
	sessionTermId: string;
	schoolSessionId: string;
	title: string;
	sessionTitle?: string | null;
	label: string;
	classroomName?: string | null;
	isCurrent: boolean;
	rows: PayableRow[];
	totals: {
		totalDue: number;
		totalPaid: number;
		totalPending: number;
	};
};

type ManualStreamRow = {
	id: string;
	studentTermFormId: string;
	streamId: string | null;
	description: string;
	payableAmount: string;
	amount: string;
};

type AutoGroup = {
	id: string;
	memberKeys: string[];
	defaultStreamId: string | null;
	defaultStreamName: string | null;
	description: string;
	payableAmount: number;
	amount: number;
	termLabels: string[];
};

type PurchaseSuggestion = {
	id: string;
	label: string;
	title?: string | null;
	description?: string | null;
	amount?: number | null;
	streamId?: string | null;
	streamName?: string | null;
	collectable?: boolean | null;
	isActive?: boolean | null;
	classroomDepartments?: { id: string }[];
	applicableClasses?: { id: string }[];
};

type SimplePaymentTypeOption = {
	id: string;
	title: string;
	streamId: string;
	streamName: string;
	hasOutstanding: boolean;
	hasConfiguredItems: boolean;
	defaultAmount: number;
	descriptions: SimpleDescriptionOption[];
};

type SimpleDescriptionOption = {
	id: string;
	source: "configuredItem" | "outstandingCharge";
	title: string;
	description?: string | null;
	itemId?: string | null;
	chargeId?: string | null;
	streamId: string;
	amountDue: number;
	defaultAmount: number;
	termLabel?: string | null;
	isActive: boolean;
};

type SimplePaymentTypeComboboxItem = SimplePaymentTypeOption & {
	label: string;
};
type SimpleDescriptionComboboxItem = SimpleDescriptionOption & {
	label: string;
};

const paymentMethods = ["Bank Transfer", "Cash", "POS / Card", "Cheque"];

function formatCurrency(amount: number) {
	return `NGN ${Number(amount || 0).toLocaleString()}`;
}

function clampAmount(value: number, max: number) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(value, max));
}

function toNumber(value: string | number | null | undefined) {
	return Number(value || 0);
}

function normalizeOptionText(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function ReceivePaymentSheet() {
	const [advancedMode, setAdvancedMode] = useState(false);

	if (advancedMode) {
		return (
			<LegacyReceivePaymentSheet
				onExitAdvanced={() => setAdvancedMode(false)}
			/>
		);
	}

	return (
		<SimpleReceivePaymentSheet onUseAdvanced={() => setAdvancedMode(true)} />
	);
}

function SimpleReceivePaymentSheet({
	onUseAdvanced,
}: {
	onUseAdvanced: () => void;
}) {
	const {
		receivePayment: receivePaymentOpen,
		receivePaymentStudentId,
		receivePaymentStudentName,
		setParams,
	} = useReceivePaymentParams();
	const studentSheetParams = useStudentParams();
	const { setParams: setAddFeeParams } = useAddFeeParams();
	const trpc = useTRPC();
	const formatStudentName = useStudentNameFormatter();
	const qc = useQueryClient();
	const isOpen = Boolean(receivePaymentOpen);
	const selectedStudentId = receivePaymentStudentId || "";

	const [studentSearch, setStudentSearch] = useState("");
	const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
	const [paymentDate, setPaymentDate] = useState(
		format(new Date(), "yyyy-MM-dd"),
	);
	const [reference, setReference] = useState("");
	const [note, setNote] = useState("");
	const [selectedPaymentTypeId, setSelectedPaymentTypeId] = useState("");
	const [customPaymentTypeTitle, setCustomPaymentTypeTitle] = useState("");
	const [selectedDescriptionId, setSelectedDescriptionId] = useState("");
	const [customDescriptionTitle, setCustomDescriptionTitle] = useState("");
	const [amountDue, setAmountDue] = useState("");
	const [amountPaid, setAmountPaid] = useState("");
	const [receiptState, setReceiptState] = useState<ReceiptState | null>(null);

	const resetPaymentChoice = () => {
		setSelectedPaymentTypeId("");
		setCustomPaymentTypeTitle("");
		setSelectedDescriptionId("");
		setCustomDescriptionTitle("");
		setAmountDue("");
		setAmountPaid("");
		setNote("");
		setReceiptState(null);
	};

	useEffect(() => {
		if (!isOpen) {
			setStudentSearch("");
			setPaymentMethod(paymentMethods[0]);
			setPaymentDate(format(new Date(), "yyyy-MM-dd"));
			setReference("");
			resetPaymentChoice();
		}
	}, [isOpen]);

	useEffect(() => {
		resetPaymentChoice();
	}, [selectedStudentId]);

	const { data: searchResults = [] } = useQuery(
		trpc.finance.searchStudentsForPayment.queryOptions(
			{ query: studentSearch || undefined },
			{ enabled: isOpen },
		),
	);

	const { data: optionsData, isLoading } = useQuery(
		trpc.finance.getReceivePaymentOptions.queryOptions(
			{ studentId: selectedStudentId },
			{ enabled: isOpen && Boolean(selectedStudentId) },
		),
	);

	const studentOptions = searchResults.map((student) => ({
		id: student.id,
		label: formatStudentName(student) || student.name,
		classroom: student.classroom,
		term: student.currentTermLabel,
		hasCurrentTermSheet: student.hasCurrentTermSheet,
	}));

	const selectedStudent =
		studentOptions.find((student) => student.id === selectedStudentId) ||
		(optionsData?.student
			? {
					id: optionsData.student.id,
					label: optionsData.student.name,
					classroom: optionsData.student.currentClassroom,
					term: optionsData.student.currentTerm,
					hasCurrentTermSheet: Boolean(optionsData.student.currentTermFormId),
				}
			: undefined);

	const paymentTypes = (optionsData?.paymentTypes ??
		[]) as SimplePaymentTypeOption[];

	const selectedPaymentType =
		paymentTypes.find((option) => option.id === selectedPaymentTypeId) ??
		(customPaymentTypeTitle
			? {
					id: "custom-payment-type",
					title: customPaymentTypeTitle,
					streamId: "",
					streamName: customPaymentTypeTitle,
					hasOutstanding: false,
					hasConfiguredItems: false,
					defaultAmount: 0,
					descriptions: [],
				}
			: undefined);

	const descriptionOptions = selectedPaymentType?.descriptions ?? [];
	const selectedDescription =
		descriptionOptions.find((option) => option.id === selectedDescriptionId) ??
		(customDescriptionTitle
			? {
					id: "custom-description",
					source: "configuredItem" as const,
					title: customDescriptionTitle,
					streamId: selectedPaymentType?.streamId ?? "",
					amountDue: Number(amountDue || 0),
					defaultAmount: Number(amountPaid || amountDue || 0),
					isActive: true,
				}
			: undefined);
	const canCreateReusableSimpleCollection = Boolean(
		optionsData?.permissions?.canCreateSimpleCollection,
	);
	const canCreateSchoolFee = Boolean(
		optionsData?.permissions?.canCreateSchoolFee,
	);

	const paymentTypeItems = useMemo<SimplePaymentTypeComboboxItem[]>(
		() =>
			paymentTypes.map((option) => ({
				...option,
				label: option.title,
			})),
		[paymentTypes],
	);
	const selectedPaymentTypeItem = selectedPaymentType
		? {
				...selectedPaymentType,
				label: selectedPaymentType.title,
			}
		: undefined;
	const descriptionItems = useMemo<SimpleDescriptionComboboxItem[]>(
		() =>
			descriptionOptions.map((option) => ({
				...option,
				label: option.title,
			})),
		[descriptionOptions],
	);
	const selectedDescriptionItem = selectedDescription
		? {
				...selectedDescription,
				label: selectedDescription.title,
			}
		: undefined;

	const receivePaymentMutation = useMutation(
		trpc.finance.receiveStudentPaymentSimple.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Recording payment...",
					success: "Payment recorded",
					error: "Could not record payment",
				},
			},
			onSuccess(result) {
				if (!selectedStudentId) return;
				void Promise.all([
					qc.invalidateQueries({
						queryKey: trpc.finance.getReceivePaymentOptions.queryKey({
							studentId: selectedStudentId,
						}),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getReceivePaymentData.queryKey({
							studentId: selectedStudentId,
						}),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getStudentPayments.queryKey({
							studentId: selectedStudentId,
						}),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getCharges.queryKey(),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
					}),
				]);
				setReceiptState({
					paymentIds: result.paymentIds,
					count: result.count,
					totalAllocated: result.totalAllocated,
				});
				setReference("");
				setNote("");
			},
		}),
	);
	const createReusableItemMutation = useMutation(
		trpc.finance.createItem.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Saving payment option...",
					success: "Payment option saved",
					error: "Could not save payment option",
				},
			},
			onSuccess() {
				void Promise.all([
					qc.invalidateQueries({
						queryKey: trpc.finance.getItems.queryKey(),
					}),
					selectedStudentId
						? qc.invalidateQueries({
								queryKey: trpc.finance.getReceivePaymentOptions.queryKey({
									studentId: selectedStudentId,
								}),
							})
						: Promise.resolve(),
				]);
			},
		}),
	);

	const openReceipt = (paymentIds: string[], download = false) => {
		if (!paymentIds.length) return;
		const params = new URLSearchParams({
			paymentIds: paymentIds.join(","),
		});
		if (download) params.set("download", "true");
		window.open(
			`/api/pdf/student-payment-receipt?${params.toString()}`,
			"_blank",
		);
	};

	const handleStudentSelect = (studentId: string) => {
		setReceiptState(null);
		setParams({
			receivePayment: true,
			receivePaymentStudentId: studentId,
			receivePaymentStudentName: null,
			receivePaymentCreatedStudentId: null,
			receivePaymentReturnTo: null,
		});
	};

	const openCreateStudent = (name?: string) => {
		const fallbackName = (
			name ||
			studentSearch ||
			receivePaymentStudentName ||
			""
		).trim();
		setParams({
			receivePayment: null,
			receivePaymentStudentId: null,
			receivePaymentStudentName: fallbackName || null,
			receivePaymentReturnTo: "student-create",
		});
		studentSheetParams.setParams({
			createStudent: true,
			createStudentPrefillName: fallbackName || null,
			createStudentReturnTo: "receive-payment",
		});
	};

	const handlePaymentTypeSelect = (option: SimplePaymentTypeOption) => {
		setSelectedPaymentTypeId(option.id);
		setCustomPaymentTypeTitle("");
		const firstDescription = option.descriptions[0];
		setSelectedDescriptionId(firstDescription?.id ?? "");
		setCustomDescriptionTitle("");
		const defaultAmount =
			firstDescription?.defaultAmount ?? option.defaultAmount ?? 0;
		setAmountDue(defaultAmount ? String(defaultAmount) : "");
		setAmountPaid(defaultAmount ? String(defaultAmount) : "");
		setReceiptState(null);
	};

	const handleDescriptionSelect = (option: SimpleDescriptionOption) => {
		setSelectedDescriptionId(option.id);
		setCustomDescriptionTitle("");
		const defaultAmount = option.defaultAmount ?? option.amountDue ?? 0;
		setAmountDue(option.amountDue ? String(option.amountDue) : "");
		setAmountPaid(defaultAmount ? String(defaultAmount) : "");
		setReceiptState(null);
	};

	const canSubmit =
		Boolean(selectedStudentId) &&
		Boolean(selectedPaymentType) &&
		Boolean(selectedDescription || customDescriptionTitle.trim()) &&
		Number(amountPaid) > 0 &&
		!receivePaymentMutation.isPending &&
		!createReusableItemMutation.isPending;

	const submit = async () => {
		if (!canSubmit || !selectedPaymentType) return;
		const normalizedCustomDescription = normalizeOptionText(
			customDescriptionTitle,
		);
		const matchedExistingDescription = normalizedCustomDescription
			? descriptionOptions.find(
					(option) =>
						normalizeOptionText(option.title) === normalizedCustomDescription,
				)
			: null;
		let reusableItemId =
			selectedDescription?.itemId ?? matchedExistingDescription?.itemId ?? null;
		const shouldCreateReusableItem =
			canCreateReusableSimpleCollection &&
			!selectedDescription?.chargeId &&
			!reusableItemId &&
			Boolean(customPaymentTypeTitle || customDescriptionTitle) &&
			Number(amountDue || amountPaid || 0) > 0;

		if (shouldCreateReusableItem) {
			const createdItem = await createReusableItemMutation.mutateAsync({
				id: null,
				streamId: selectedPaymentType.streamId || null,
				streamName: selectedPaymentType.streamName || selectedPaymentType.title,
				accountType: "CREDIT",
				type: "OTHER",
				name:
					customDescriptionTitle.trim() ||
					selectedDescription?.title ||
					selectedPaymentType.title,
				description: note.trim() || null,
				amount: Number(amountDue || amountPaid),
				collectable: true,
				isActive: true,
				sessionId: null,
				termId: null,
				classRoomDepartmentIds: [],
			});
			reusableItemId = createdItem.id;
		}

		await receivePaymentMutation.mutateAsync({
			studentId: selectedStudentId,
			studentTermFormId: optionsData?.student?.currentTermFormId ?? null,
			chargeId:
				selectedDescription?.chargeId ??
				matchedExistingDescription?.chargeId ??
				null,
			itemId: reusableItemId,
			streamId: selectedPaymentType.streamId || null,
			streamName: selectedPaymentType.streamName || selectedPaymentType.title,
			paymentTypeTitle: selectedPaymentType.title,
			descriptionTitle:
				selectedDescription?.title || customDescriptionTitle.trim() || null,
			description: note.trim() || selectedDescription?.description || null,
			amountDue: amountDue ? Number(amountDue) : null,
			amountPaid: Number(amountPaid),
			method: paymentMethod,
			paymentDate: paymentDate ? new Date(`${paymentDate}T00:00:00`) : null,
			reference: reference.trim() || null,
			note: note.trim() || null,
			termId: optionsData?.context?.termId ?? null,
			sessionId: optionsData?.context?.sessionId ?? null,
		});
	};

	return (
		<>
			<Sheet
				open={isOpen}
				onOpenChange={(open) => {
					if (!open) {
						setParams({
							receivePayment: null,
							receivePaymentStudentId: null,
							receivePaymentStudentName: null,
							receivePaymentCreatedStudentId: null,
							receivePaymentReturnTo: null,
						});
					}
				}}
			>
			<SheetContent className="flex h-[100dvh] w-full flex-col overflow-hidden p-0 sm:max-w-[640px]">
				<SheetHeader className="shrink-0 border-b px-6 py-5">
					<div className="flex items-center justify-between gap-3">
						<SheetTitle>Receive Student Payment</SheetTitle>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={onUseAdvanced}
							>
							Advanced
						</Button>
					</div>
				</SheetHeader>

				<div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
					<div className="space-y-2">
						<Label>Select student</Label>
						<div className="relative">
							<Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<ComboboxDropdown
								items={studentOptions}
								selectedItem={selectedStudent}
								placeholder="Search by student name"
								searchPlaceholder="Search by student name..."
								className="pl-2"
								onSearch={(value) => {
									setStudentSearch(value);
									if (
										receivePaymentStudentName &&
										value !== receivePaymentStudentName
									) {
										setParams({ receivePaymentStudentName: value || null });
									}
								}}
								onSelect={(student) => handleStudentSelect(student.id)}
								onCreate={(value) => {
									setStudentSearch(value);
									openCreateStudent(value);
								}}
								renderOnCreate={(value) => (
									<div className="flex items-center gap-2 text-primary">
										<UserPlus className="h-4 w-4" />
										<span>Create student "{value}"</span>
									</div>
								)}
								renderSelectedItem={(student) => <span>{student.label}</span>}
								renderListItem={({ item }) => (
									<div className="flex w-full items-center justify-between gap-3">
										<div className="flex flex-col">
											<span className="font-medium">{item.label}</span>
											<span className="text-xs text-muted-foreground">
													{[item.classroom, item.term]
														.filter(Boolean)
														.join(" • ") || "No term sheet yet"}
											</span>
										</div>
										{!item.hasCurrentTermSheet ? (
											<Badge variant="outline">No current sheet</Badge>
										) : null}
									</div>
								)}
							/>
							{customPaymentTypeTitle && canCreateSchoolFee ? (
								<Button
									type="button"
									variant="outline"
									className="w-full gap-2"
									onClick={() => {
										setParams({
											receivePayment: null,
											receivePaymentStudentId: null,
											receivePaymentStudentName: null,
											receivePaymentCreatedStudentId: null,
											receivePaymentReturnTo: null,
										});
										setAddFeeParams({
											addFee: true,
											addFeeClassroomId:
												optionsData?.student?.classroomDepartmentId ?? null,
											addFeeStudentId: selectedStudent.id,
											addFeeStudentTermFormId:
												optionsData?.student?.currentTermFormId ?? null,
											addFeeTitle: customPaymentTypeTitle,
										});
									}}
								>
									<Plus className="h-4 w-4" />
									Create as school fee
								</Button>
							) : null}
						</div>
							{!selectedStudent &&
							(studentSearch || receivePaymentStudentName) ? (
							<Button
								type="button"
								variant="outline"
								className="gap-2"
								onClick={() => openCreateStudent()}
							>
								<UserPlus className="h-4 w-4" />
									Create student "
									{(studentSearch || receivePaymentStudentName || "").trim()}"
							</Button>
						) : null}
					</div>

					{selectedStudent ? (
						<Card>
							<CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
										<h3 className="text-base font-semibold">
											{selectedStudent.label}
										</h3>
									<p className="text-sm text-muted-foreground">
										{[
												optionsData?.student?.currentClassroom ||
													selectedStudent.classroom,
												optionsData?.student?.currentTerm ||
													selectedStudent.term,
										]
											.filter(Boolean)
											.join(" • ") || "No active term sheet"}
									</p>
								</div>
								<div className="text-sm font-medium">
										{formatCurrency(
											optionsData?.summary?.totalOutstanding || 0,
										)}{" "}
										outstanding
								</div>
							</CardContent>
						</Card>
					) : null}

					{receiptState ? (
						<Alert>
							<CheckCircle2 className="h-4 w-4" />
							<AlertTitle>Payment recorded successfully</AlertTitle>
							<AlertDescription className="space-y-3">
								<p>
									{receiptState.count} payment allocation
									{receiptState.count !== 1 ? "s" : ""} recorded for{" "}
									{formatCurrency(receiptState.totalAllocated)}.
								</p>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										size="sm"
										onClick={() => openReceipt(receiptState.paymentIds)}
									>
										Print Receipt
									</Button>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => openReceipt(receiptState.paymentIds, true)}
									>
										Download PDF
									</Button>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={resetPaymentChoice}
									>
										Record another payment
									</Button>
								</div>
							</AlertDescription>
						</Alert>
					) : null}

					<div className="grid gap-4">
						<div className="space-y-2">
							<Label>Payment type</Label>
							<ComboboxDropdown<SimplePaymentTypeComboboxItem>
								items={paymentTypeItems}
								selectedItem={selectedPaymentTypeItem}
								disabled={!selectedStudentId || isLoading}
									placeholder={
										isLoading
											? "Loading payment types..."
											: "Select payment type"
									}
								searchPlaceholder="Search payment types..."
								onSelect={handlePaymentTypeSelect}
								onCreate={(value) => {
									const trimmed = value.trim();
									if (!trimmed) return;
									const existing = paymentTypes.find(
										(option) =>
											normalizeOptionText(option.title) ===
											normalizeOptionText(trimmed),
									);
									if (existing) {
										handlePaymentTypeSelect(existing);
										return;
									}
									setSelectedPaymentTypeId("");
									setCustomPaymentTypeTitle(trimmed);
									setSelectedDescriptionId("");
									setCustomDescriptionTitle("");
									setAmountDue("");
									setAmountPaid("");
									setReceiptState(null);
								}}
								renderOnCreate={(value) => (
									<div className="flex items-center gap-2 text-primary">
										<Plus className="h-4 w-4" />
										<span>Add "{value}"</span>
									</div>
								)}
								renderListItem={({ item }) => (
									<div className="flex w-full items-center justify-between gap-3">
										<div className="flex flex-col">
											<span className="font-medium">{item.title}</span>
											<span className="text-xs text-muted-foreground">
												{item.descriptions.length} option
												{item.descriptions.length !== 1 ? "s" : ""}
											</span>
										</div>
										{item.hasOutstanding ? (
											<Badge variant="secondary">Outstanding</Badge>
										) : null}
									</div>
								)}
							/>
						</div>

						<div className="space-y-2">
							<Label>Description</Label>
								<ComboboxDropdown<SimpleDescriptionComboboxItem>
								items={descriptionItems}
								selectedItem={selectedDescriptionItem}
								disabled={!selectedPaymentType}
								placeholder="Select or type description"
								searchPlaceholder="Search descriptions..."
								onSelect={handleDescriptionSelect}
								onCreate={(value) => {
									const trimmed = value.trim();
									if (!trimmed) return;
									const existing = descriptionOptions.find(
										(option) =>
											normalizeOptionText(option.title) ===
											normalizeOptionText(trimmed),
									);
									if (existing) {
										handleDescriptionSelect(existing);
										return;
									}
									setSelectedDescriptionId("");
									setCustomDescriptionTitle(trimmed);
									const defaultAmount =
											selectedPaymentType?.defaultAmount ||
											Number(amountPaid || 0);
									setAmountDue(defaultAmount ? String(defaultAmount) : "");
									setAmountPaid(defaultAmount ? String(defaultAmount) : "");
									setReceiptState(null);
								}}
								renderOnCreate={(value) => (
									<div className="flex items-center gap-2 text-primary">
										<Plus className="h-4 w-4" />
										<span>Use "{value}"</span>
									</div>
								)}
								renderListItem={({ item }) => (
									<div className="flex w-full items-center justify-between gap-3">
										<div className="flex flex-col">
											<span className="font-medium">{item.title}</span>
											<span className="text-xs text-muted-foreground">
													{item.termLabel ||
														item.description ||
														"Current option"}
											</span>
										</div>
										<span className="text-sm font-medium">
											{formatCurrency(item.defaultAmount)}
										</span>
									</div>
								)}
							/>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label>Price / amount due</Label>
								<Input
									type="number"
									min="0"
									value={amountDue}
									onChange={(event) => {
										setAmountDue(event.target.value);
										if (!amountPaid) setAmountPaid(event.target.value);
									}}
									placeholder="0.00"
								/>
							</div>
							<div className="space-y-2">
								<Label>Amount paying</Label>
								<Input
									type="number"
									min="0"
									value={amountPaid}
									onChange={(event) => setAmountPaid(event.target.value)}
									placeholder="0.00"
								/>
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label>Payment method</Label>
									<Select
										value={paymentMethod}
										onValueChange={setPaymentMethod}
									>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{paymentMethods.map((method) => (
											<SelectItem key={method} value={method}>
												{method}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-2">
								<Label>Payment date</Label>
								<div className="relative">
									<Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<Input
										className="pl-10"
										type="date"
										value={paymentDate}
										onChange={(event) => setPaymentDate(event.target.value)}
									/>
								</div>
							</div>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label>Reference</Label>
								<Input
									value={reference}
									onChange={(event) => setReference(event.target.value)}
									placeholder="TRX-00123"
								/>
							</div>
							<div className="space-y-2">
								<Label>Note</Label>
								<Input
									value={note}
									onChange={(event) => setNote(event.target.value)}
									placeholder="Optional note"
								/>
							</div>
						</div>
					</div>
				</div>

				<div className="shrink-0 border-t bg-background/95 px-6 py-4 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.45)] backdrop-blur supports-[backdrop-filter]:bg-background/85">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="text-sm font-semibold">
								{formatCurrency(Number(amountPaid || 0))}
							</p>
							<p className="text-xs text-muted-foreground">
								{selectedPaymentType?.title || "Select a payment type"}
								{selectedDescription?.title || customDescriptionTitle
									? ` • ${selectedDescription?.title || customDescriptionTitle}`
									: ""}
							</p>
							{(customPaymentTypeTitle || customDescriptionTitle) &&
							selectedPaymentType ? (
								<p className="mt-1 text-xs text-muted-foreground">
									{canCreateReusableSimpleCollection
										? "New option will be saved for future payments."
										: "New option will be recorded for this payment only."}
								</p>
							) : null}
						</div>
						<div className="grid grid-cols-2 gap-3 sm:flex">
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									setParams({
										receivePayment: null,
										receivePaymentStudentId: null,
										receivePaymentStudentName: null,
										receivePaymentCreatedStudentId: null,
										receivePaymentReturnTo: null,
									})
								}
							>
								Cancel
							</Button>
							<Button
								type="button"
								className="gap-2"
								disabled={!canSubmit}
								onClick={() => void submit()}
							>
								<CreditCard className="h-4 w-4" />
								<span className="sm:hidden">Confirm</span>
								<span className="hidden sm:inline">Confirm payment</span>
							</Button>
						</div>
					</div>
				</div>
				</SheetContent>
			</Sheet>
			<AddFeeSheet />
		</>
	);
}

function LegacyReceivePaymentSheet({
	onExitAdvanced,
}: {
	onExitAdvanced: () => void;
}) {
	const {
		receivePayment: receivePaymentOpen,
		receivePaymentStudentId,
		receivePaymentStudentName,
		setParams,
	} = useReceivePaymentParams();
	const studentSheetParams = useStudentParams();
	const isOpen = Boolean(receivePaymentOpen);
	const selectedStudentId = receivePaymentStudentId || "";
	const { setParams: setAddFeeParams } = useAddFeeParams();
	const trpc = useTRPC();
	const formatStudentName = useStudentNameFormatter();
	const qc = useQueryClient();

	const [studentSearch, setStudentSearch] = useState("");
	const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
	const [paymentDate, setPaymentDate] = useState(
		format(new Date(), "yyyy-MM-dd"),
	);
	const [reference, setReference] = useState("");
	const [selection, setSelection] = useState<SelectionState>({});
	const [openTermId, setOpenTermId] = useState<string | null>(null);
	const [manualRows, setManualRows] = useState<ManualStreamRow[]>([]);
	const [autoOverrides, setAutoOverrides] = useState<
		Record<string, { streamId?: string | null; description?: string }>
	>({});
	const [purchaseSearch, setPurchaseSearch] = useState("");
	const [receiptState, setReceiptState] = useState<ReceiptState | null>(null);

	const resetPaymentMeta = () => {
		setPaymentMethod(paymentMethods[0]);
		setPaymentDate(format(new Date(), "yyyy-MM-dd"));
		setReference("");
		setReceiptState(null);
	};

	const resetAllocationState = () => {
		setSelection({});
		setOpenTermId(null);
		setManualRows([]);
		setAutoOverrides({});
	};

	useEffect(() => {
		if (!isOpen) {
			setStudentSearch("");
			setPurchaseSearch("");
			resetPaymentMeta();
			resetAllocationState();
		}
	}, [isOpen]);

	useEffect(() => {
		resetAllocationState();
	}, [selectedStudentId]);

	const { data: searchResults = [] } = useQuery(
		trpc.finance.searchStudentsForPayment.queryOptions(
			{ query: studentSearch || undefined },
			{ enabled: isOpen },
		),
	);

	const { data, isLoading } = useQuery(
		trpc.finance.getReceivePaymentData.queryOptions(
			{ studentId: selectedStudentId },
			{ enabled: isOpen && Boolean(selectedStudentId) },
		),
	);

	const { data: streamResults = [] } = useQuery(
		trpc.finance.getStreams.queryOptions(
			{ filter: "term" },
			{ enabled: isOpen },
		),
	);

	const { data: purchaseSuggestions = [] } = useQuery(
		trpc.finance.getStudentPurchaseSuggestions.queryOptions(
			{ query: purchaseSearch || undefined },
			{ enabled: isOpen },
		),
	);

	const terms = (data?.terms ?? []) as TermData[];

	useEffect(() => {
		if (!terms.length) {
			setOpenTermId(null);
			return;
		}
		if (openTermId && terms.some((term) => term.id === openTermId)) {
			return;
		}
		const firstPending =
			terms.find((term) => term.totals.totalPending > 0)?.id ??
			terms.find((term) => term.isCurrent)?.id ??
			terms[0]?.id ??
			null;
		setOpenTermId(firstPending);
	}, [openTermId, terms]);

	const studentOptions = searchResults.map((student) => ({
		id: student.id,
		label: formatStudentName(student) || student.name,
		classroomId: student.classroomId || null,
		classroom: student.classroom,
		term: student.currentTermLabel,
		hasCurrentTermSheet: student.hasCurrentTermSheet,
	}));

	const selectedStudent: any =
		studentOptions.find((student) => student.id === selectedStudentId) ||
		(data?.student
			? {
					id: data.student.id,
					label: formatStudentName(data.student) || data.student.name,
					classroomId:
						(data.currentTermForm as any)?.classroomDepartment?.id || null,
					classroom: data.student.currentClassroom,
					term: data.student.currentTerm,
					hasCurrentTermSheet: Boolean(data.currentTermForm?.id),
				}
			: undefined);

	const allRows = useMemo(() => terms.flatMap((term) => term.rows), [terms]);
	const rowMap = useMemo(
		() => new Map(allRows.map((row) => [row.key, row])),
		[allRows],
	);
	const termMap = useMemo(
		() => new Map(terms.map((term) => [term.id, term])),
		[terms],
	);

	const streamOptions = useMemo(() => {
		const merged = new Map<string, StreamOption>();

		for (const stream of streamResults) {
			merged.set(stream.id, {
				id: stream.id,
				label: stream.name,
				name: stream.name,
				type: stream.type,
				defaultType: stream.defaultType,
			});
		}

		for (const row of allRows) {
			if (row.streamId && row.streamName && !merged.has(row.streamId)) {
				merged.set(row.streamId, {
					id: row.streamId,
					label: row.streamName,
					name: row.streamName,
				});
			}
		}

		return Array.from(merged.values());
	}, [allRows, streamResults]);

	const purchaseOptions = useMemo(
		() =>
			(purchaseSuggestions ?? [])
				.filter((item) => {
					const classRows =
						item.classroomDepartments ?? item.applicableClasses ?? [];
					if (!classRows.length || !selectedStudent?.classroomId) {
						return true;
					}

					return classRows.some(
						(row) => row.id === selectedStudent.classroomId,
					);
				})
				.map((item) => ({
					id: item.id,
					label:
						item.description || item.title || item.streamName || "Fee item",
					description:
						item.description || item.title || item.streamName || "Fee item",
					amount: item.amount,
					streamId: item.streamId,
					streamName: item.streamName,
					collectable: item.collectable,
					isActive: item.isActive,
				})),
		[purchaseSuggestions, selectedStudent?.classroomId],
	);

	const streamItemOptions = useMemo(() => {
		const options = new Map<string, typeof purchaseOptions>();

		const addOption = (
			key: string | null | undefined,
			item: (typeof purchaseOptions)[number],
		) => {
			if (!key || item.isActive === false) return;
			const existing = options.get(key) ?? [];
			if (!existing.some((existingItem) => existingItem.id === item.id)) {
				options.set(key, [...existing, item]);
			}
		};

		for (const item of purchaseOptions) {
			addOption(item.streamId, item);
			addOption(item.streamName?.trim().toLowerCase(), item);
		}

		return options;
	}, [purchaseOptions]);

	const getStreamItemOptions = (stream?: StreamOption | null) => {
		if (!stream) return [];
		const byId = streamItemOptions.get(stream.id) ?? [];
		const byName =
			streamItemOptions.get(stream.name.trim().toLowerCase()) ?? [];
		const merged = new Map<string, (typeof purchaseOptions)[number]>();
		for (const item of [...byId, ...byName]) {
			merged.set(item.id, item);
		}
		return Array.from(merged.values());
	};

	const getFirstStreamItem = (stream?: StreamOption | null) =>
		getStreamItemOptions(stream)[0];

	const autoGroups = useMemo(() => {
		const groups = new Map<string, AutoGroup>();
		for (const row of allRows) {
			const current = selection[row.key];
			const amount = toNumber(current?.amount);
			if (!current?.selected || amount <= 0) continue;

			const defaultGroupKey =
				row.streamId || row.streamName || `ungrouped:${row.key}`;
			const id = `auto:${defaultGroupKey}`;
			const existing = groups.get(id);
			if (!existing) {
				groups.set(id, {
					id,
					memberKeys: [row.key],
					defaultStreamId: row.streamId ?? null,
					defaultStreamName: row.streamName ?? null,
					description: row.title,
					payableAmount: row.pendingAmount,
					amount,
					termLabels: [termMap.get(row.studentTermFormId)?.title || "Term"],
				});
				continue;
			}

			existing.memberKeys.push(row.key);
			existing.description = Array.from(
				new Set(
					`${existing.description}, ${row.title}`
						.split(",")
						.map((item) => item.trim())
						.filter(Boolean),
				),
			).join(", ");
			existing.payableAmount += row.pendingAmount;
			existing.amount += amount;
			existing.termLabels = Array.from(
				new Set([
					...existing.termLabels,
					termMap.get(row.studentTermFormId)?.title || "Term",
				]),
			);
		}

		return Array.from(groups.values());
	}, [allRows, selection, termMap]);

	const totalSelected = allRows.reduce((sum, row) => {
		const current = selection[row.key];
		return sum + (current?.selected ? toNumber(current.amount) : 0);
	}, 0);
	const manualTotal = manualRows.reduce(
		(sum, row) => sum + toNumber(row.amount),
		0,
	);
	const totalAllocated = totalSelected + manualTotal;
	const amountReceivedNumber = totalAllocated;

	const currentTerm =
		terms.find((term) => term.id === openTermId) ??
		terms.find((term) => term.isCurrent) ??
		terms[0];

	const receivePaymentMutation = useMutation(
		trpc.finance.receiveStudentPayment.mutationOptions({
			meta: {
				toastTitle: {
					loading: "Recording payment...",
					success: "Payment recorded",
					error: "Could not record payment",
				},
			},
			onSuccess(result) {
				if (!selectedStudentId) return;
				void Promise.all([
					qc.invalidateQueries({
						queryKey: trpc.finance.getReceivePaymentData.queryKey({
							studentId: selectedStudentId,
						}),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getStudentPayments.queryKey({
							studentId: selectedStudentId,
						}),
					}),
					qc.invalidateQueries({
						queryKey: trpc.transactions.studentAccounting.queryKey({
							studentId: selectedStudentId,
						}),
					}),
					qc.invalidateQueries({
						queryKey: trpc.transactions.getStudentFees.queryKey(),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getCharges.queryKey(),
					}),
					qc.invalidateQueries({
						queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
					}),
				]);
				setReceiptState({
					paymentIds: result.paymentIds,
					count: result.count,
					totalAllocated: result.totalAllocated,
				});
				resetAllocationState();
				setReference("");
			},
		}),
	);

	const openReceipt = (paymentIds: string[], download = false) => {
		if (!paymentIds.length) return;
		const params = new URLSearchParams({
			paymentIds: paymentIds.join(","),
		});
		if (download) params.set("download", "true");
		window.open(
			`/api/pdf/student-payment-receipt?${params.toString()}`,
			"_blank",
		);
	};

	const handleStudentSelect = (studentId: string) => {
		setReceiptState(null);
		setParams({
			receivePayment: true,
			receivePaymentStudentId: studentId,
			receivePaymentStudentName: null,
			receivePaymentCreatedStudentId: null,
			receivePaymentReturnTo: null,
		});
	};

	const openCreateStudent = (name?: string) => {
		const fallbackName = (
			name ||
			studentSearch ||
			receivePaymentStudentName ||
			""
		).trim();
		setParams({
			receivePayment: null,
			receivePaymentStudentId: null,
			receivePaymentStudentName: fallbackName || null,
			receivePaymentReturnTo: "student-create",
		});
		studentSheetParams.setParams({
			createStudent: true,
			createStudentPrefillName: fallbackName || null,
			createStudentReturnTo: "receive-payment",
		});
	};

	const toggleRow = (row: PayableRow, checked: boolean) => {
		setSelection((prev) => ({
			...prev,
			[row.key]: {
				selected: checked,
				amount: checked
					? prev[row.key]?.amount || String(row.pendingAmount)
					: "0",
			},
		}));
	};

	const updateRowAmount = (row: PayableRow, value: string) => {
		if (value === "") {
			setSelection((prev) => ({
				...prev,
				[row.key]: {
					selected: prev[row.key]?.selected ?? true,
					amount: "",
				},
			}));
			return;
		}

		const nextAmount = clampAmount(Number(value), row.pendingAmount);
		setSelection((prev) => ({
			...prev,
			[row.key]: {
				selected: true,
				amount: String(nextAmount),
			},
		}));
	};

	const autoAllocate = () => {
		const next: SelectionState = {};

		for (const row of allRows) {
			const due = Number(row.pendingAmount || 0);
			if (due <= 0 || row.status === "PAID") {
				next[row.key] = { selected: false, amount: "0" };
				continue;
			}
			next[row.key] = {
				selected: true,
				amount: String(due),
			};
		}

		setSelection(next);
	};

	const redistributeGroup = (groupId: string, nextAmount: number) => {
		const group = autoGroups.find((item) => item.id === groupId);
		if (!group) return;

		let remaining = clampAmount(nextAmount, group.payableAmount);
		setSelection((prev) => {
			const next = { ...prev };
			for (const memberKey of group.memberKeys) {
				const row = rowMap.get(memberKey);
				if (!row) continue;
				const allocated = Math.min(row.pendingAmount, remaining);
				next[memberKey] = {
					selected: allocated > 0,
					amount: allocated > 0 ? String(allocated) : "0",
				};
				remaining -= allocated;
			}
			return next;
		});
	};

	const addManualRow = () => {
		const fallbackTermId =
			openTermId || data?.currentTermForm?.id || terms[0]?.id || null;
		if (!fallbackTermId) return;
		const defaultStream = streamOptions[0];
		const defaultItem = getFirstStreamItem(defaultStream);
		const defaultAmount = defaultItem ? String(defaultItem.amount || 0) : "";
		setManualRows((prev) => [
			...prev,
			{
				id: `manual-${Date.now()}`,
				studentTermFormId: fallbackTermId,
				streamId: defaultStream?.id ?? null,
				description: defaultItem?.label ?? defaultStream?.name ?? "",
				payableAmount: defaultAmount,
				amount: defaultAmount,
			},
		]);
	};

	const updateManualRowFields = (
		id: string,
		values: Partial<ManualStreamRow>,
	) => {
		setManualRows((prev) =>
			prev.map((row) => (row.id === id ? { ...row, ...values } : row)),
		);
	};

	const updateManualRow = (
		id: string,
		field: keyof ManualStreamRow,
		value: string | null,
	) => {
		setManualRows((prev) =>
			prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
		);
	};

	const removeManualRow = (id: string) => {
		setManualRows((prev) => prev.filter((row) => row.id !== id));
	};

	const submit = () => {
		if (!selectedStudentId) return;

		const autoAllocations = allRows
			.map((row) => {
				const current = selection[row.key];
				if (!current?.selected) return null;
				const amountToPay = toNumber(current.amount);
				if (amountToPay <= 0) return null;

				const group = autoGroups.find((item) =>
					item.memberKeys.includes(row.key),
				);
				const override = group ? autoOverrides[group.id] : undefined;
				const effectiveStream = override?.streamId
					? streamOptions.find((stream) => stream.id === override.streamId)
					: undefined;

				return {
					source: row.source,
					studentTermFormId: row.studentTermFormId,
					studentFeeId: row.studentFeeId ?? null,
					billableHistoryId: row.billableHistoryId ?? null,
					feeHistoryId: row.feeHistoryId ?? null,
					streamId: override?.streamId ?? row.streamId ?? null,
					streamName: effectiveStream?.name ?? row.streamName ?? null,
					title: row.title,
					description: row.description ?? override?.description ?? row.title,
					amountDue: row.pendingAmount,
					amountToPay,
				};
			})
			.filter(Boolean);

		const manualAllocations = manualRows
			.filter(
				(row) =>
					toNumber(row.amount) > 0 &&
					toNumber(row.payableAmount || row.amount) > 0 &&
					row.studentTermFormId,
			)
			.map((row) => {
				const stream = streamOptions.find((item) => item.id === row.streamId);
				return {
					source: "manual" as const,
					studentTermFormId: row.studentTermFormId,
					studentFeeId: null,
					billableHistoryId: null,
					feeHistoryId: null,
					streamId: row.streamId,
					streamName: stream?.name ?? null,
					title: row.description || stream?.name || "Manual Charge",
					description: row.description || stream?.name || "Manual Charge",
					amountDue: toNumber(row.payableAmount || row.amount),
					amountToPay: toNumber(row.amount),
				};
			});

		const allocations = [...autoAllocations, ...manualAllocations];
		if (!allocations.length) return;

		receivePaymentMutation.mutate({
			studentId: selectedStudentId,
			studentTermFormId:
				currentTerm?.id ||
				data?.currentTermForm?.id ||
				allocations[0].studentTermFormId,
			paymentMethod,
			paymentDate: paymentDate
				? new Date(`${paymentDate}T00:00:00`)
				: undefined,
			reference: reference.trim() || undefined,
			amountReceived: amountReceivedNumber,
			allocations,
		});
	};

	const canSubmit = Boolean(selectedStudentId) && totalAllocated > 0;

	return (
		<Sheet
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					setParams({
						receivePayment: null,
						receivePaymentStudentId: null,
						receivePaymentStudentName: null,
						receivePaymentCreatedStudentId: null,
						receivePaymentReturnTo: null,
					});
				}
			}}
		>
			<SheetContent className="flex h-[100dvh] w-full flex-col overflow-hidden p-0 sm:max-w-[880px]">
				<SheetHeader className="shrink-0 border-b px-6 py-5">
					<div className="flex items-center justify-between gap-3">
						<SheetTitle>Receive Student Payment</SheetTitle>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onExitAdvanced}
						>
							Simple mode
						</Button>
					</div>
				</SheetHeader>

				<div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
					<div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
						<div className="space-y-2">
							<Label>Select student</Label>
							<div className="relative">
								<Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
									<ComboboxDropdown
									items={studentOptions}
									selectedItem={selectedStudent}
									placeholder="Search by student name"
									searchPlaceholder="Search by student name..."
									className="pl-2"
									onSearch={(value) => {
										setStudentSearch(value);
										if (
											receivePaymentStudentName &&
											value !== receivePaymentStudentName
										) {
											setParams({ receivePaymentStudentName: value || null });
										}
									}}
									onSelect={(student) => handleStudentSelect(student.id)}
									onCreate={(value) => {
										setStudentSearch(value);
										openCreateStudent(value);
									}}
									renderOnCreate={(value) => (
										<div className="flex items-center gap-2 text-primary">
											<UserPlus className="h-4 w-4" />
											<span>Create student "{value}"</span>
										</div>
									)}
									renderSelectedItem={(student) => <span>{student.label}</span>}
									renderListItem={({ item }) => (
										<div className="flex w-full items-center justify-between gap-3">
											<div className="flex flex-col">
												<span className="font-medium">{item.label}</span>
												<span className="text-xs text-muted-foreground">
													{[item.classroom, item.term]
														.filter(Boolean)
														.join(" • ") || "No term sheet yet"}
												</span>
											</div>
											{!item.hasCurrentTermSheet ? (
												<Badge variant="outline">No current sheet</Badge>
											) : null}
										</div>
									)}
								/>
							</div>
							{!selectedStudent &&
							(studentSearch || receivePaymentStudentName) ? (
								<Button
									type="button"
									variant="outline"
									className="gap-2"
									onClick={() => openCreateStudent()}
								>
									<UserPlus className="h-4 w-4" />
									Create student "
									{(studentSearch || receivePaymentStudentName || "").trim()}"
								</Button>
							) : null}
						</div>

						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
							<div className="space-y-2">
								<Label>Payment method</Label>
								<Select value={paymentMethod} onValueChange={setPaymentMethod}>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{paymentMethods.map((method) => (
											<SelectItem key={method} value={method}>
												{method}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label>Payment date</Label>
							<div className="relative">
								<Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									className="pl-10"
									type="date"
									value={paymentDate}
									onChange={(event) => setPaymentDate(event.target.value)}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label>Reference</Label>
							<Input
								value={reference}
								onChange={(event) => setReference(event.target.value)}
								placeholder="TRX-00123"
							/>
						</div>
					</div>

					{selectedStudent ? (
						<Card>
							<CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<h3 className="text-lg font-semibold">
										{selectedStudent.label}
									</h3>
									<p className="text-sm text-muted-foreground">
										{[
											data?.student?.currentClassroom,
											data?.student?.currentTerm,
										]
											.filter(Boolean)
											.join(" • ") || "No active term sheet"}
									</p>
								</div>
								<div className="text-left sm:text-right">
									<p className="text-xs uppercase tracking-wide text-muted-foreground">
										Outstanding Across Terms
									</p>
									<p className="text-2xl font-bold">
										{formatCurrency(data?.summary?.totalPending || 0)}
									</p>
									<Button
										type="button"
										variant="link"
										className="h-auto px-0 text-sm"
										onClick={() => {
											if (!selectedStudentId || !data?.currentTermForm?.id)
												return;
											setParams({
												receivePayment: null,
												receivePaymentStudentId: null,
												receivePaymentStudentName: null,
												receivePaymentCreatedStudentId: null,
												receivePaymentReturnTo: null,
											});
											studentSheetParams.setParams({
												studentViewId: selectedStudentId,
												studentTermSheetId: data.currentTermForm.id,
												studentViewTermId: data.currentTermForm.sessionTermId,
												studentViewTab: "finance",
											});
										}}
									>
										Open student overview
									</Button>
								</div>
							</CardContent>
						</Card>
					) : null}

					{data?.alert ? (
						<Alert variant={data.alert.variant}>
							<AlertTriangle className="h-4 w-4" />
							<AlertTitle>{data.alert.title}</AlertTitle>
							<AlertDescription>{data.alert.description}</AlertDescription>
						</Alert>
					) : null}

					{receiptState ? (
						<Alert>
							<CheckCircle2 className="h-4 w-4" />
							<AlertTitle>Payment recorded successfully</AlertTitle>
							<AlertDescription className="space-y-3">
								<p>
									{receiptState.count} allocation
									{receiptState.count !== 1 ? "s" : ""} recorded for{" "}
									{formatCurrency(receiptState.totalAllocated)}.
								</p>
								<div className="flex flex-wrap gap-2">
									<Button
										type="button"
										size="sm"
										onClick={() => openReceipt(receiptState.paymentIds)}
									>
										Print Receipt
									</Button>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => openReceipt(receiptState.paymentIds, true)}
									>
										Download PDF
									</Button>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={() => setReceiptState(null)}
									>
										Record another payment
									</Button>
								</div>
							</AlertDescription>
						</Alert>
					) : null}

					<div className="space-y-3">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h3 className="text-sm font-semibold">Term Payables</h3>
								<p className="text-sm text-muted-foreground">
									Select a student, expand a term, then choose the lines to
									collect.
								</p>
							</div>
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
								{selectedStudentId && (
									<Button
										variant="outline"
										size="sm"
										className="w-full gap-2 sm:w-auto"
										type="button"
										onClick={() =>
											setAddFeeParams({
												addFee: true,
												addFeeClassroomId: selectedStudent?.classroomId || null,
											})
										}
									>
										<Plus className="h-4 w-4" />
										Add Fee
									</Button>
								)}
								<Button
									variant="ghost"
									size="sm"
									className="w-full gap-2 sm:w-auto"
									type="button"
									onClick={autoAllocate}
									disabled={!allRows.length}
								>
									<Wand2 className="h-4 w-4" />
									Select all pending
								</Button>
							</div>
						</div>

						<div className="flex gap-3 overflow-x-auto pb-2">
							{terms.length ? (
								terms.map((term) => {
									const isOpenTerm = openTermId === term.id;
									return (
										<button
											key={term.id}
											type="button"
											onClick={() =>
												setOpenTermId((current) =>
													current === term.id ? null : term.id,
												)
											}
											className={cn(
												"min-w-[190px] rounded-lg border px-4 py-3 text-left transition-colors",
												isOpenTerm
													? "border-primary bg-primary/5 text-foreground"
													: "border-border bg-card hover:bg-muted/50",
											)}
										>
											<div className="flex items-center gap-2">
												<span className="text-sm font-semibold">
													{term.title}
												</span>
												{term.isCurrent ? (
													<Badge variant="secondary">Current</Badge>
												) : null}
											</div>
											<p className="mt-1 text-xs text-muted-foreground">
												{formatCurrency(term.totals.totalPaid)} /{" "}
												{formatCurrency(term.totals.totalDue)} paid
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{term.sessionTitle ||
													term.classroomName ||
													"Student term"}
											</p>
										</button>
									);
								})
							) : (
								<div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
									{isLoading
										? "Loading terms..."
										: "Select a student to load payable terms."}
								</div>
							)}
						</div>

						{currentTerm ? (
							<Card>
								<CardContent className="p-0">
									<div className="flex items-center justify-between border-b px-4 py-3">
										<div>
											<h4 className="font-semibold">{currentTerm.label}</h4>
											<p className="text-sm text-muted-foreground">
												{currentTerm.classroomName || "Term charges"}
											</p>
										</div>
										<Badge variant="outline">
											{formatCurrency(currentTerm.totals.totalPending)} pending
										</Badge>
									</div>

									<div className="hidden overflow-x-auto md:block">
										<table className="w-full text-sm">
											<thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
												<tr>
													<th className="px-4 py-3">Select</th>
													<th className="px-4 py-3">Item</th>
													<th className="px-4 py-3 text-right">Payable</th>
													<th className="px-4 py-3 text-right">Paid</th>
													<th className="px-4 py-3 text-right">Pending</th>
													<th className="px-4 py-3 text-right">Pay now</th>
												</tr>
											</thead>
											<tbody className="divide-y">
												{currentTerm.rows.length ? (
													currentTerm.rows.map((row) => {
														const current = selection[row.key];
														const isPaid = row.status === "PAID";
														return (
															<tr
																key={row.key}
																className={cn(
																	current?.selected && "bg-primary/5",
																)}
															>
																<td className="px-4 py-3">
																	<Checkbox
																		checked={Boolean(current?.selected)}
																		disabled={isPaid}
																		onCheckedChange={(checked) =>
																			toggleRow(row, Boolean(checked))
																		}
																	/>
																</td>
																<td className="px-4 py-3">
																	<div className="flex flex-col gap-1">
																		<div className="flex flex-wrap items-center gap-2">
																			<span className="font-medium">
																				{row.title}
																			</span>
																			<Badge variant="outline">
																				{row.status}
																			</Badge>
																			{row.streamName ? (
																				<Badge variant="secondary">
																					{row.streamName}
																				</Badge>
																			) : null}
																		</div>
																		{row.description ? (
																			<p className="text-xs text-muted-foreground">
																				{row.description}
																			</p>
																		) : null}
																	</div>
																</td>
																<td className="px-4 py-3 text-right">
																	{formatCurrency(row.amount)}
																</td>
																<td className="px-4 py-3 text-right">
																	{formatCurrency(row.paidAmount || 0)}
																</td>
																<td className="px-4 py-3 text-right font-medium">
																	{formatCurrency(row.pendingAmount)}
																</td>
																<td className="px-4 py-3">
																	<Input
																		type="number"
																		min="0"
																		max={row.pendingAmount}
																		value={current?.amount || ""}
																		disabled={!current?.selected || isPaid}
																		onChange={(event) =>
																			updateRowAmount(row, event.target.value)
																		}
																	/>
																</td>
															</tr>
														);
													})
												) : (
													<tr>
														<td
															className="px-4 py-8 text-center text-muted-foreground"
															colSpan={6}
														>
															No payable items in this term.
														</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
									<div className="p-4 md:hidden">
										{currentTerm.rows.length ? (
											<ItemGroup className="gap-3">
												{currentTerm.rows.map((row) => {
													const current = selection[row.key];
													const isPaid = row.status === "PAID";

													return (
														<Item
															key={row.key}
															variant={current?.selected ? "muted" : "outline"}
															className={cn(
																"items-start rounded-lg",
																current?.selected &&
																	"border-primary/30 bg-primary/5",
															)}
														>
															<ItemContent className="min-w-0 gap-3">
																<ItemHeader>
																	<ItemTitle className="w-full min-w-0 flex-1">
																		<span className="truncate">
																			{row.title}
																		</span>
																	</ItemTitle>
																	<Checkbox
																		checked={Boolean(current?.selected)}
																		disabled={isPaid}
																		onCheckedChange={(checked) =>
																			toggleRow(row, Boolean(checked))
																		}
																		aria-label={`Select ${row.title}`}
																	/>
																</ItemHeader>
																<ItemDescription>
																	{row.description || "No description"}
																</ItemDescription>
																<div className="flex flex-wrap gap-2">
																	<Badge variant="outline">{row.status}</Badge>
																	{row.streamName ? (
																		<Badge variant="secondary">
																			{row.streamName}
																		</Badge>
																	) : null}
																</div>
																<div className="grid gap-2 text-xs sm:grid-cols-3">
																	<div>
																		<p className="text-muted-foreground">
																			Payable
																		</p>
																		<p className="font-medium">
																			{formatCurrency(row.amount)}
																		</p>
																	</div>
																	<div>
																		<p className="text-muted-foreground">
																			Paid
																		</p>
																		<p className="font-medium">
																			{formatCurrency(row.paidAmount || 0)}
																		</p>
																	</div>
																	<div>
																		<p className="text-muted-foreground">
																			Pending
																		</p>
																		<p className="font-medium">
																			{formatCurrency(row.pendingAmount)}
																		</p>
																	</div>
																</div>
																<ItemFooter className="items-end gap-3">
																	<div className="min-w-0 flex-1 space-y-1">
																		<Label className="text-xs">Pay now</Label>
																		<Input
																			type="number"
																			min="0"
																			max={row.pendingAmount}
																			value={current?.amount || ""}
																			disabled={!current?.selected || isPaid}
																			onChange={(event) =>
																				updateRowAmount(row, event.target.value)
																			}
																		/>
																	</div>
																	<ItemActions>
																		<Button
																			type="button"
																			variant={
																				current?.selected
																					? "secondary"
																					: "outline"
																			}
																			size="sm"
																			disabled={isPaid}
																			onClick={() =>
																				toggleRow(row, !current?.selected)
																			}
																		>
																			{current?.selected
																				? "Selected"
																				: "Select"}
																		</Button>
																	</ItemActions>
																</ItemFooter>
															</ItemContent>
														</Item>
													);
												})}
											</ItemGroup>
										) : (
											<div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
												No payable items in this term.
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						) : null}
					</div>

					<div className="space-y-3">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h3 className="text-sm font-semibold">Stream Allocations</h3>
								<p className="text-sm text-muted-foreground">
									Payable selections map into stream rows automatically. Add
									extra rows when needed.
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								className="w-full gap-2 sm:w-auto"
								onClick={addManualRow}
							>
								<Plus className="h-4 w-4" />
								Add Stream Row
							</Button>
						</div>

						<Card>
							<CardContent className="p-0">
								<div className="overflow-x-auto md:overflow-visible">
									<table className="w-full text-sm">
										<thead className="hidden bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground md:table-header-group">
											<tr>
												<th className="px-4 py-3">Stream</th>
												<th className="px-4 py-3">Description</th>
												<th className="px-4 py-3 text-right">Payable</th>
												<th className="px-4 py-3 text-right">Amount</th>
												<th className="px-4 py-3 text-right">Action</th>
											</tr>
										</thead>
										<tbody className="block divide-y md:table-row-group">
											{!autoGroups.length && !manualRows.length ? (
												<tr className="block md:table-row">
													<td
														colSpan={5}
														className="block px-4 py-8 text-center text-muted-foreground md:table-cell"
													>
														No allocations yet. Select payable rows above or add
														a manual stream entry.
													</td>
												</tr>
											) : null}

											{autoGroups.map((group) => {
												const override = autoOverrides[group.id];
												const effectiveStreamId =
													override?.streamId ?? group.defaultStreamId ?? null;
												const effectiveStream =
													streamOptions.find(
														(stream) => stream.id === effectiveStreamId,
													) ??
													(group.defaultStreamName
														? {
																id: group.defaultStreamId || group.id,
																label: group.defaultStreamName,
																name: group.defaultStreamName,
															}
														: undefined);
												const effectiveDescription =
													override?.description || group.description;
												const descriptionOptions =
													getStreamItemOptions(effectiveStream);
												const selectedDescription =
													descriptionOptions.find(
														(item) => item.label === effectiveDescription,
													) ||
													(effectiveDescription
														? {
																id: effectiveDescription,
																label: effectiveDescription,
																description: effectiveDescription,
																amount: group.amount,
															}
														: undefined);

												return (
													<tr
														key={group.id}
														className="block bg-primary/5 p-4 md:table-row md:p-0"
													>
														<td className="block px-0 py-2 align-top md:table-cell md:px-4 md:py-3">
															<span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
																Stream
															</span>
															<div className="space-y-2 md:min-w-[220px]">
																<ComboboxDropdown
																	items={streamOptions}
																	selectedItem={effectiveStream}
																	placeholder="Select stream"
																	searchPlaceholder="Search streams..."
																	onSelect={(stream) => {
																		const firstItem =
																			getFirstStreamItem(stream);
																		setAutoOverrides((prev) => ({
																			...prev,
																			[group.id]: {
																				...prev[group.id],
																				streamId: stream.id,
																				description:
																					firstItem?.label ??
																					prev[group.id]?.description ??
																					group.description,
																			},
																		}));
																		if (firstItem) {
																			redistributeGroup(
																				group.id,
																				clampAmount(
																					Number(firstItem.amount || 0),
																					group.payableAmount,
																				),
																			);
																		}
																	}}
																/>
																<div className="flex flex-wrap gap-1">
																	<Badge variant="secondary">Auto</Badge>
																	{group.termLabels.map((label) => (
																		<Badge key={label} variant="outline">
																			{label}
																		</Badge>
																	))}
																</div>
															</div>
														</td>
														<td className="block px-0 py-2 align-top md:table-cell md:px-4 md:py-3">
															<span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
																Description
															</span>
															{descriptionOptions.length ? (
																<ComboboxDropdown
																	items={descriptionOptions}
																	selectedItem={selectedDescription}
																	placeholder="Select description"
																	searchPlaceholder="Search descriptions..."
																	onSearch={setPurchaseSearch}
																	onSelect={(item) => {
																		setAutoOverrides((prev) => ({
																			...prev,
																			[group.id]: {
																				...prev[group.id],
																				description: item.label,
																			},
																		}));
																		redistributeGroup(
																			group.id,
																			clampAmount(
																				Number(item.amount || 0),
																				group.payableAmount,
																			),
																		);
																	}}
																	renderListItem={({ item }) => (
																		<div className="flex w-full items-center justify-between gap-3">
																			<div className="flex items-center gap-2">
																				<BookOpen className="h-4 w-4 text-muted-foreground" />
																				<span>{item.label}</span>
																			</div>
																			<span className="text-xs font-medium">
																				{formatCurrency(
																					Number(item.amount || 0),
																				)}
																			</span>
																		</div>
																	)}
																/>
															) : (
																<Input
																	value={effectiveDescription}
																	onChange={(event) =>
																		setAutoOverrides((prev) => ({
																			...prev,
																			[group.id]: {
																				...prev[group.id],
																				description: event.target.value,
																			},
																		}))
																	}
																	placeholder="Allocation description"
																/>
															)}
														</td>
														<td className="flex items-center justify-between gap-3 px-0 py-2 align-top font-medium md:table-cell md:px-4 md:py-3 md:text-right">
															<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
																Payable
															</span>
															{formatCurrency(group.payableAmount)}
														</td>
														<td className="block px-0 py-2 align-top md:table-cell md:px-4 md:py-3">
															<span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
																Amount
															</span>
															<Input
																type="number"
																min="0"
																max={group.payableAmount}
																value={String(group.amount)}
																onChange={(event) =>
																	redistributeGroup(
																		group.id,
																		Number(event.target.value || 0),
																	)
																}
															/>
														</td>
														<td className="flex items-center justify-between gap-3 px-0 py-2 align-top text-xs text-muted-foreground md:table-cell md:px-4 md:py-3 md:text-right">
															<span className="font-medium uppercase tracking-wide md:hidden">
																Action
															</span>
															Grouped from {group.memberKeys.length} payable
															{group.memberKeys.length !== 1 ? "s" : ""}
														</td>
													</tr>
												);
											})}

											{manualRows.map((row) => {
												const selectedStream =
													streamOptions.find(
														(stream) => stream.id === row.streamId,
													) ?? undefined;
												const descriptionOptions =
													getStreamItemOptions(selectedStream);
												const selectedDescription =
													descriptionOptions.find(
														(item) => item.label === row.description,
													) ||
													(row.description
														? {
																id: row.description,
																label: row.description,
																description: row.description,
																amount: toNumber(row.amount),
															}
														: undefined);
												const rowTerm = termMap.get(row.studentTermFormId);
												return (
													<tr
														key={row.id}
														className="block p-4 md:table-row md:p-0"
													>
														<td className="block px-0 py-2 align-top md:table-cell md:px-4 md:py-3">
															<span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
																Stream
															</span>
															<div className="space-y-2 md:min-w-[220px]">
																<ComboboxDropdown
																	items={streamOptions}
																	selectedItem={selectedStream}
																	placeholder="Select stream"
																	searchPlaceholder="Search streams..."
																	onSelect={(stream) => {
																		const firstItem =
																			getFirstStreamItem(stream);
																		const defaultAmount = firstItem
																			? String(firstItem.amount || 0)
																			: "";
																		const defaultDescription =
																			firstItem?.label || stream.name;
																		updateManualRowFields(row.id, {
																			streamId: stream.id,
																			description: defaultDescription,
																			payableAmount: defaultAmount,
																			amount: defaultAmount,
																		});
																	}}
																/>
																{rowTerm ? (
																	<Badge variant="outline">
																		{rowTerm.title}
																	</Badge>
																) : null}
															</div>
														</td>
														<td className="block px-0 py-2 align-top md:table-cell md:px-4 md:py-3">
															<span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
																Description
															</span>
															{descriptionOptions.length ? (
																<ComboboxDropdown
																	items={descriptionOptions}
																	selectedItem={selectedDescription}
																	placeholder="Select description"
																	searchPlaceholder="Search descriptions..."
																	onSearch={setPurchaseSearch}
																	onSelect={(item) => {
																		const nextAmount = String(item.amount || 0);
																		updateManualRowFields(row.id, {
																			description: item.label,
																			payableAmount: nextAmount,
																			amount: nextAmount,
																		});
																	}}
																	renderListItem={({ item }) => (
																		<div className="flex w-full items-center justify-between gap-3">
																			<div className="flex items-center gap-2">
																				<BookOpen className="h-4 w-4 text-muted-foreground" />
																				<span>{item.label}</span>
																			</div>
																			<span className="text-xs font-medium">
																				{formatCurrency(
																					Number(item.amount || 0),
																				)}
																			</span>
																		</div>
																	)}
																/>
															) : (
																<Input
																	value={row.description}
																	onChange={(event) =>
																		updateManualRow(
																			row.id,
																			"description",
																			event.target.value,
																		)
																	}
																	placeholder="Description"
																/>
															)}
														</td>
														<td className="block px-0 py-2 align-top md:table-cell md:px-4 md:py-3">
															<span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
																Payable
															</span>
															<Input
																type="number"
																min="0"
																value={row.payableAmount}
																onChange={(event) =>
																	updateManualRow(
																		row.id,
																		"payableAmount",
																		event.target.value,
																	)
																}
																placeholder="0.00"
															/>
														</td>
														<td className="block px-0 py-2 align-top md:table-cell md:px-4 md:py-3">
															<span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
																Amount
															</span>
															<Input
																type="number"
																min="0"
																value={row.amount}
																onChange={(event) =>
																	updateManualRow(
																		row.id,
																		"amount",
																		event.target.value,
																	)
																}
																placeholder="0.00"
															/>
														</td>
														<td className="flex items-center justify-between gap-3 px-0 py-2 align-top md:table-cell md:px-4 md:py-3 md:text-right">
															<span className="text-xs font-medium uppercase tracking-wide text-muted-foreground md:hidden">
																Action
															</span>
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onClick={() => removeManualRow(row.id)}
															>
																<Trash2 className="h-4 w-4" />
															</Button>
														</td>
													</tr>
												);
											})}
										</tbody>
										<tfoot className="block bg-muted/20 md:table-footer-group">
											<tr className="flex items-center justify-between gap-3 px-4 py-3 md:table-row md:px-0 md:py-0">
												<td
													className="font-semibold md:px-4 md:py-3"
													colSpan={3}
												>
													Allocation summary
												</td>
												<td className="text-right font-semibold md:px-4 md:py-3">
													{formatCurrency(totalAllocated)}
												</td>
												<td className="hidden md:table-cell md:px-4 md:py-3" />
											</tr>
										</tfoot>
									</table>
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="rounded-lg border bg-muted/20 p-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="text-sm font-semibold">Payment total</p>
								<p className="text-sm text-muted-foreground">
									The payment amount is calculated from the Pay now fields.
								</p>
							</div>
							<div className="flex items-center gap-3">
								<Badge variant="outline">
									Selected payables: {formatCurrency(totalSelected)}
								</Badge>
								<Badge variant="outline">
									Manual rows: {formatCurrency(manualTotal)}
								</Badge>
							</div>
						</div>

						{amountReceivedNumber > 0 ? (
							<div className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">
								<CheckCircle2 className="mt-0.5 h-4 w-4" />
								<p className="text-sm">
									Ready to record {formatCurrency(amountReceivedNumber)}.
								</p>
							</div>
						) : null}
					</div>
				</div>
				<div className="shrink-0 border-t bg-background/95 px-6 py-4 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.45)] backdrop-blur supports-[backdrop-filter]:bg-background/85">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="text-sm font-semibold">
								{formatCurrency(amountReceivedNumber)}
							</p>
							<p className="text-xs text-muted-foreground">
								{totalSelected > 0
									? `${formatCurrency(totalSelected)} selected payables`
									: "Select payable rows or add stream rows"}
								{manualTotal > 0
									? ` + ${formatCurrency(manualTotal)} manual rows`
									: ""}
							</p>
						</div>
						<div className="grid grid-cols-2 gap-3 sm:flex">
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									setParams({
										receivePayment: null,
										receivePaymentStudentId: null,
										receivePaymentStudentName: null,
										receivePaymentCreatedStudentId: null,
										receivePaymentReturnTo: null,
									})
								}
							>
								Cancel
							</Button>
							<Button
								type="button"
								className="gap-2"
								disabled={!canSubmit || receivePaymentMutation.isPending}
								onClick={submit}
							>
								<CreditCard className="h-4 w-4" />
								<span className="sm:hidden">Confirm</span>
								<span className="hidden sm:inline">Confirm payment</span>
							</Button>
						</div>
					</div>
				</div>
			</SheetContent>
			<AddFeeSheet />
		</Sheet>
	);
}
