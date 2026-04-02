"use client";

import { MiddaySearchFilter } from "@/components/midday-search-filter/search-filter";
import { useSchoolFeeParams } from "@/hooks/use-school-fee-params";
import { useTRPC } from "@/trpc/client";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@school-clerk/ui/alert-dialog";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { Table } from "@school-clerk/ui/data-table";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@school-clerk/ui/sheet";
import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { columns } from "./columns";
import { EmptyState } from "./empty-states";

// ── Apply Fee Dialog ──────────────────────────────────────────────────────────

function ApplyFeeDialog({
	feeHistoryId,
	onClose,
}: {
	feeHistoryId: string | null;
	onClose: () => void;
}) {
	const trpc = useTRPC();
	const qc = useQueryClient();

	const { data: preview, isLoading } = useQuery({
		...trpc.transactions.getFeeApplyPreview.queryOptions({
			feeHistoryId: feeHistoryId ?? "",
		}),
		enabled: Boolean(feeHistoryId),
	});

	const { mutate, isPending } = useMutation(
		trpc.transactions.applyFeeToClass.mutationOptions({
			onSuccess(data) {
				qc.invalidateQueries({
					queryKey: trpc.transactions.getStudentFees.queryKey(),
				});
				toast.success(
					`${data.applied} student${data.applied !== 1 ? "s" : ""} applied${data.skipped ? `, ${data.skipped} already had this fee` : ""}.`,
				);
				onClose();
			},
		}),
	);

	return (
		<AlertDialog
			open={Boolean(feeHistoryId)}
			onOpenChange={(open) => !open && onClose()}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Apply fee to students</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-3">
							{isLoading ? (
								<p className="text-sm text-muted-foreground">
									Loading preview…
								</p>
							) : preview ? (
								<>
									<p className="text-sm">
										This will apply{" "}
										<span className="font-semibold">{preview.feeTitle}</span>{" "}
										(NGN {Number(preview.amount).toLocaleString()}) to eligible
										students.
									</p>
									<div className="rounded-lg border bg-muted/40 p-3 space-y-1.5 text-sm">
										<div className="flex justify-between">
											<span className="text-muted-foreground">Scope</span>
											<span className="font-medium">
												{preview.isAllClasses
													? "All classes"
													: preview.classrooms
															.map((c) => c.departmentName)
															.filter(Boolean)
															.join(", ")}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												Eligible students
											</span>
											<span className="font-medium">
												{preview.eligibleStudents}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												Already applied
											</span>
											<span className="font-medium text-green-600">
												{preview.alreadyApplied}
											</span>
										</div>
										<div className="flex justify-between border-t pt-1.5">
											<span className="font-medium">Will be applied to</span>
											<span className="font-semibold text-primary">
												{preview.toApply} students
											</span>
										</div>
									</div>
									{preview.toApply === 0 && (
										<p className="text-sm text-green-600">
											✓ All eligible students already have this fee applied.
										</p>
									)}
								</>
							) : null}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={
							isPending || isLoading || !preview || preview.toApply === 0
						}
						onClick={() => feeHistoryId && mutate({ feeHistoryId })}
					>
						{isPending
							? "Applying…"
							: `Apply to ${preview?.toApply ?? "…"} students`}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

// ── Import Fees Sheet ─────────────────────────────────────────────────────────

function ImportFeesSheet() {
	const { importSchoolFee, setParams } = useSchoolFeeParams();
	const trpc = useTRPC();
	const qc = useQueryClient();
	const [selected, setSelected] = useState<string[]>([]);

	const { data: previous = [] } = useQuery(
		trpc.transactions.getPreviousTermFees.queryOptions(),
	);

	const { mutate, isPending } = useMutation(
		trpc.transactions.importFees.mutationOptions({
			onSuccess(data) {
				qc.invalidateQueries({
					queryKey: trpc.transactions.getSchoolFees.queryKey(),
				});
				qc.invalidateQueries({
					queryKey: trpc.finance.getStreams.queryKey({ filter: "term" }),
				});
				toast.success(
					`${data.imported} fee${data.imported !== 1 ? "s" : ""} imported successfully.`,
				);
				setSelected([]);
				setParams({ importSchoolFee: null });
			},
		}),
	);

	function toggleSelect(id: string) {
		setSelected((prev) =>
			prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
		);
	}

	function toggleAll() {
		if (selected.length === previous.length) {
			setSelected([]);
		} else {
			setSelected(previous.map((f) => f.id));
		}
	}

	return (
		<Sheet
			open={Boolean(importSchoolFee)}
			onOpenChange={(open) => {
				if (!open) {
					setSelected([]);
					setParams({ importSchoolFee: null });
				}
			}}
		>
			<SheetContent className="flex flex-col gap-4 sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>Import Fees from Previous Terms</SheetTitle>
					<SheetDescription>
						Select fees to carry over into the current term. Stream and
						classroom assignments are copied automatically.
					</SheetDescription>
				</SheetHeader>

				{previous.length === 0 ? (
					<div className="flex flex-1 items-center justify-center">
						<p className="text-sm text-muted-foreground">
							No importable fees found. All fees from previous terms are already
							in this term.
						</p>
					</div>
				) : (
					<>
						<div className="flex items-center gap-2 border-b pb-2">
							<Checkbox
								checked={selected.length === previous.length}
								onCheckedChange={toggleAll}
								id="select-all"
							/>
							<label
								htmlFor="select-all"
								className="text-sm font-medium cursor-pointer"
							>
								Select all ({previous.length})
							</label>
						</div>
						<div className="flex-1 overflow-y-auto space-y-2">
							{previous.map((item) => (
								<div
									key={item.id}
									className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"
								>
									<Checkbox
										checked={selected.includes(item.id)}
										onCheckedChange={() => toggleSelect(item.id)}
										className="mt-0.5"
									/>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between gap-2">
											<span className="font-medium text-sm truncate">
												{item.fee.title}
											</span>
											<span className="text-sm font-semibold shrink-0">
												NGN {Number(item.amount).toLocaleString()}
											</span>
										</div>
										{item.fee.description && (
											<p className="text-xs text-muted-foreground mt-0.5">
												{item.fee.description}
											</p>
										)}
										<div className="flex items-center gap-2 mt-1.5 flex-wrap">
											{item.wallet && (
												<Badge variant="secondary" className="text-xs">
													{item.wallet.name}
												</Badge>
											)}
											{item.classroomDepartments.length > 0 ? (
												<span className="text-xs text-muted-foreground">
													{item.classroomDepartments
														.map((d) => d.departmentName)
														.filter(Boolean)
														.join(", ")}
												</span>
											) : (
												<span className="text-xs text-muted-foreground">
													All classes
												</span>
											)}
											<Badge variant="outline" className="text-xs">
												{item.term.title}
											</Badge>
										</div>
									</div>
									<Button
										size="sm"
										variant="ghost"
										className="shrink-0 h-7 text-xs"
										disabled={isPending}
										onClick={() => mutate({ feeHistoryIds: [item.id] })}
									>
										Import
									</Button>
								</div>
							))}
						</div>
						{selected.length > 0 && (
							<div className="border-t pt-3">
								<Button
									className="w-full"
									disabled={isPending}
									onClick={() => mutate({ feeHistoryIds: selected })}
								>
									{isPending
										? "Importing…"
										: `Import ${selected.length} selected`}
								</Button>
							</div>
						)}
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}

// ── Main DataTable ────────────────────────────────────────────────────────────

export function DataTable() {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(
		trpc.transactions.getSchoolFees.queryOptions(),
	);
	const { setParams } = useSchoolFeeParams();
	const [applyFeeHistoryId, setApplyFeeHistoryId] = useState<string | null>(
		null,
	);
	const [deleteFee, setDeleteFee] = useState<{
		feeHistoryId: string;
		title: string;
	} | null>(null);
	const qc = useQueryClient();

	const { mutate: deleteFeeMutate, isPending: deleteFeePending } = useMutation(
		trpc.transactions.deleteSchoolFeeCurrentTerm.mutationOptions({
			onSuccess(data) {
				qc.invalidateQueries({
					queryKey: trpc.transactions.getSchoolFees.queryKey(),
				});
				qc.invalidateQueries({
					queryKey: trpc.transactions.getPreviousTermFees.queryKey(),
				});
				toast.success(`${data.title} removed from the current term.`);
				setDeleteFee(null);
			},
		}),
	);

	const toolbar = (
		<div className="flex gap-1">
			<Button
				variant="outline"
				onClick={() => setParams({ importSchoolFee: true })}
			>
				Import
			</Button>
			<Button
				variant="outline"
				onClick={() => setParams({ createSchoolFee: true })}
			>
				Create Fee
			</Button>
		</div>
	);

	if (!data?.length) {
		return (
			<>
				<div className="flex justify-end mb-4">{toolbar}</div>
				<EmptyState />
				<ImportFeesSheet />
			</>
		);
	}

	return (
		<>
			<Table.Provider
				args={[
					{
						setParams,
						columns,
						tableMeta: {
							deleteAction() {},
							rowClick() {},
							onApplyFee: (feeHistoryId: string) =>
								setApplyFeeHistoryId(feeHistoryId),
							onEditFee: (feeId: string) =>
								setParams({ createSchoolFee: true, schoolFeeId: feeId }),
							onDeleteFee: (fee) => setDeleteFee(fee),
						},
						data,
					},
				]}
			>
				<div className="flex flex-col gap-4">
					<div className="flex">
						<MiddaySearchFilter
							placeholder="Search"
							filterList={[{ value: "search", icon: "Search", type: "input" }]}
						/>
						<div className="flex-1" />
						{toolbar}
					</div>
					<Table>
						<Table.Header />
						<Table.Body>
							<Table.Row />
						</Table.Body>
					</Table>
				</div>
			</Table.Provider>

			<ImportFeesSheet />
			<ApplyFeeDialog
				feeHistoryId={applyFeeHistoryId}
				onClose={() => setApplyFeeHistoryId(null)}
			/>
			<AlertDialog
				open={Boolean(deleteFee)}
				onOpenChange={(open) => !open && setDeleteFee(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove fee from current term?</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteFee
								? `${deleteFee.title} will no longer appear in this term's fee list. Previous-term versions remain available for import.`
								: ""}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setDeleteFee(null)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={!deleteFee || deleteFeePending}
							onClick={() =>
								deleteFee &&
								deleteFeeMutate({ feeHistoryId: deleteFee.feeHistoryId })
							}
						>
							{deleteFeePending ? "Removing…" : "Remove"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
