"use client";

import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@school-clerk/ui/select";
import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CustomSheet, CustomSheetContent } from "@/components/custom-sheet-content";
import { useFinanceSheetParams } from "@/hooks/use-finance-sheet-params";
import { useTRPC } from "@/trpc/client";

type PayerType = "STUDENT" | "STAFF" | "SCHOOL";
type ItemType = "TUITION_FEE" | "BOOK" | "SERVICE" | "SALARY" | "OTHER";

function fullStudentName(student: {
	name?: string | null;
	surname?: string | null;
	otherName?: string | null;
}) {
	return [student.surname, student.name, student.otherName].filter(Boolean).join(" ");
}

export function FinanceChargeSheet() {
	const { createFinanceCharge, setParams } = useFinanceSheetParams();
	const isOpen = Boolean(createFinanceCharge);

	if (!isOpen) return null;

	return (
		<CustomSheet
			floating
			rounded
			size="lg"
			open={isOpen}
			onOpenChange={() => setParams(null)}
			sheetName="finance-charge"
		>
			<SheetHeader>
				<SheetTitle>Create Finance Charge</SheetTitle>
			</SheetHeader>
			<CustomSheetContent className="flex flex-col gap-2">
				<FinanceChargeForm onSuccess={() => setParams(null)} />
			</CustomSheetContent>
		</CustomSheet>
	);
}

function FinanceChargeForm({ onSuccess }: { onSuccess: () => void }) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [payerType, setPayerType] = useState<PayerType>("STUDENT");
	const [studentSearch, setStudentSearch] = useState("");
	const [studentId, setStudentId] = useState("");
	const [staffProfileId, setStaffProfileId] = useState("");
	const [itemId, setItemId] = useState("");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [amount, setAmount] = useState("");
	const [itemType, setItemType] = useState<ItemType>("TUITION_FEE");
	const [collectionStatus, setCollectionStatus] = useState<
		"NOT_REQUIRED" | "NOT_COLLECTED" | "COLLECTED"
	>("NOT_REQUIRED");

	const { data: items = [] } = useQuery(trpc.finance.getItems.queryOptions());
	const { data: staff = [] } = useQuery(trpc.finance.getStaff.queryOptions());
	const { data: students = [] } = useQuery(
		trpc.finance.searchStudentsForPayment.queryOptions({ q: studentSearch }),
	);

	const selectedItem = useMemo(
		() => items.find((item) => item.id === itemId),
		[items, itemId],
	);

	useEffect(() => {
		if (!selectedItem) return;
		setTitle(selectedItem.name);
		setAmount(String(selectedItem.amount));
		setItemType(selectedItem.type as ItemType);
		setCollectionStatus(selectedItem.collectable ? "NOT_COLLECTED" : "NOT_REQUIRED");
	}, [selectedItem]);

	const createCharge = useMutation(
		trpc.finance.createCharge.mutationOptions({
			onSuccess: async () => {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.finance.getCharges.queryKey({}),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.finance.overview.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.finance.getLedgerEntries.queryKey(),
					}),
				]);
				onSuccess();
			},
		}),
	);

	const onSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!title.trim() || !amount) return;
		if (payerType === "STUDENT" && !studentId) return;
		if (payerType === "STAFF" && !staffProfileId) return;

		createCharge.mutate({
			itemId: itemId || null,
			streamId: null,
			type: itemType,
			payerType,
			studentId: payerType === "STUDENT" ? studentId : null,
			studentTermFormId: null,
			staffProfileId: payerType === "STAFF" ? staffProfileId : null,
			staffTermProfileId: null,
			classroomDepartmentId: null,
			sessionId: null,
			termId: null,
			title: title.trim(),
			description: description.trim() || null,
			amount: Number(amount),
			collectionStatus,
		});
	};

	return (
		<form className="space-y-4" onSubmit={onSubmit}>
			<div className="grid gap-3 md:grid-cols-2">
				<div className="space-y-2">
					<Label>Payer type</Label>
					<Select value={payerType} onValueChange={(value) => setPayerType(value as PayerType)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="STUDENT">Student</SelectItem>
							<SelectItem value="STAFF">Staff</SelectItem>
							<SelectItem value="SCHOOL">School</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label>Finance item</Label>
					<Select value={itemId || undefined} onValueChange={setItemId}>
						<SelectTrigger>
							<SelectValue placeholder="Optional item" />
						</SelectTrigger>
						<SelectContent>
							{items.map((item) => (
								<SelectItem key={item.id} value={item.id}>
									{item.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{payerType === "STUDENT" ? (
				<div className="space-y-2">
					<Label>Student</Label>
					<Input
						placeholder="Search student"
						value={studentSearch}
						onChange={(event) => setStudentSearch(event.target.value)}
					/>
					<Select value={studentId || undefined} onValueChange={setStudentId}>
						<SelectTrigger>
							<SelectValue placeholder="Select student" />
						</SelectTrigger>
						<SelectContent>
							{students.map((student) => (
								<SelectItem key={student.id} value={student.id}>
									{fullStudentName(student)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			) : null}

			{payerType === "STAFF" ? (
				<div className="space-y-2">
					<Label>Staff</Label>
					<Select value={staffProfileId || undefined} onValueChange={setStaffProfileId}>
						<SelectTrigger>
							<SelectValue placeholder="Select staff" />
						</SelectTrigger>
						<SelectContent>
							{staff.map((person) => (
								<SelectItem key={person.id} value={person.id}>
									{person.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			) : null}

			<div className="grid gap-3 md:grid-cols-2">
				<div className="space-y-2">
					<Label>Type</Label>
					<Select value={itemType} onValueChange={(value) => setItemType(value as ItemType)}>
						<SelectTrigger>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="TUITION_FEE">Tuition fee</SelectItem>
							<SelectItem value="BOOK">Book</SelectItem>
							<SelectItem value="SERVICE">Service</SelectItem>
							<SelectItem value="SALARY">Salary</SelectItem>
							<SelectItem value="OTHER">Other</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div className="space-y-2">
					<Label>Amount</Label>
					<Input
						inputMode="decimal"
						placeholder="0"
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
					/>
				</div>
			</div>

			<div className="space-y-2">
				<Label>Title</Label>
				<Input
					placeholder="Tuition Fee"
					value={title}
					onChange={(event) => setTitle(event.target.value)}
				/>
			</div>
			<div className="space-y-2">
				<Label>Description</Label>
				<Input
					placeholder="Optional note"
					value={description}
					onChange={(event) => setDescription(event.target.value)}
				/>
			</div>
			<div className="space-y-2">
				<Label>Collection status</Label>
				<Select
					value={collectionStatus}
					onValueChange={(value) => setCollectionStatus(value as typeof collectionStatus)}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="NOT_REQUIRED">Not required</SelectItem>
						<SelectItem value="NOT_COLLECTED">Not collected</SelectItem>
						<SelectItem value="COLLECTED">Collected</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<Button disabled={createCharge.isPending} type="submit">
				Create Charge
			</Button>
		</form>
	);
}
