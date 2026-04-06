"use client";

import { useTermBillableParams } from "@/hooks/use-term-billable-params";
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
import { Button } from "@school-clerk/ui/button";
import { Table } from "@school-clerk/ui/data-table";
import { toast } from "@school-clerk/ui/use-toast";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { type BillableTableMeta, columns } from "./columns";
import { EmptyState } from "./empty-states";

export function DataTable() {
	const trpc = useTRPC();
	const { data } = useSuspenseQuery(trpc.finance.getBillables.queryOptions());
	const { setParams, ...params } = useTermBillableParams();
	const qc = useQueryClient();
	const [deleteBillable, setDeleteBillable] = useState<{
		billableId: string;
		title: string;
	} | null>(null);
	const { mutate: deleteBillableMutate, isPending: deleteBillablePending } =
		useMutation(
			trpc.finance.deleteBillable.mutationOptions({
				onSuccess(result) {
					qc.invalidateQueries({
						queryKey: trpc.finance.getBillables.queryKey(),
					});
					toast({
						title: "Billable deleted",
						description: `${result.title} has been removed from service billables.`,
						variant: "success",
					});
					setDeleteBillable(null);
				},
			}),
		);

	const openBillable = (billableId?: string) => {
		setParams({
			createTermBillable: true,
			billableId: billableId ?? null,
		});
	};

	if (!data?.length) {
		return <EmptyState />;
	}

	return (
		<>
			<Table.Provider
				args={[
					{
						setParams,
						params,
						columns,
						tableMeta: {
							deleteAction() {},
							rowClick(id) {
								openBillable(id);
							},
							onOpenBillable: openBillable,
							onDeleteBillable: (billable) => setDeleteBillable(billable),
						} as BillableTableMeta,
						data,
					},
				]}
			>
				<div className="flex flex-col gap-4">
					<div className="flex">
						<div className="flex-1" />
						<Button
							variant="outline"
							onClick={() => {
								openBillable();
							}}
						>
							Create Service Billable
						</Button>
					</div>
					<Table>
						<Table.Header />
						<Table.Body>
							<Table.Row />
						</Table.Body>
					</Table>
				</div>
			</Table.Provider>

			<AlertDialog
				open={Boolean(deleteBillable)}
				onOpenChange={(open) => !open && setDeleteBillable(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this service billable?</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteBillable
								? `${deleteBillable.title} will be removed from the staff billables list. Existing records stay in history, but it will no longer be available for new bills.`
								: ""}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setDeleteBillable(null)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={!deleteBillable || deleteBillablePending}
							onClick={() =>
								deleteBillable &&
								deleteBillableMutate({
									billableId: deleteBillable.billableId,
								})
							}
						>
							{deleteBillablePending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
