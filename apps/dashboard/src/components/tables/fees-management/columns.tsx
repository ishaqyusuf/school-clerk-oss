"use client";

import type { SchoolFeePageItem } from "@/actions/get-school-fees";
import { Menu } from "@/components/menu";
import { Badge } from "@school-clerk/ui/badge";
import { Button } from "@school-clerk/ui/button";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Users } from "lucide-react";

export type Item = SchoolFeePageItem;

export type FeeTableMeta = {
	onApplyFee?: (feeHistoryId: string) => void;
	onEditFee?: (feeId: string) => void;
	onDeleteFee?: (args: { feeHistoryId: string; title: string }) => void;
};

export const columns: ColumnDef<Item>[] = [
	{
		header: "Fee",
		accessorKey: "class_room",
		cell: ({ row: { original: item } }) => (
			<div>
				<div className="font-semibold">{item.title}</div>
				{item.description && (
					<div className="text-xs text-muted-foreground">
						{item.description}
					</div>
				)}
			</div>
		),
	},
	{
		header: "Amount",
		accessorKey: "amount",
		cell: ({ row: { original: item } }) => {
			const amount = item.feeHistory?.[0]?.amount ?? item.amount;
			return (
				<div className="font-medium">
					{amount != null ? `NGN ${Number(amount).toLocaleString()}` : "—"}
				</div>
			);
		},
	},
	{
		header: "Stream",
		accessorKey: "stream",
		cell: ({ row: { original: item } }) => {
			const streamName = item.feeHistory?.[0]?.wallet?.name;
			return streamName ? (
				<Badge variant="secondary">{streamName}</Badge>
			) : (
				<span className="text-xs text-muted-foreground">—</span>
			);
		},
	},
	{
		header: "Classrooms",
		accessorKey: "classrooms",
		cell: ({ row: { original: item } }) => {
			const depts = item.feeHistory?.[0]?.classroomDepartments ?? [];
			if (!depts.length)
				return (
					<span className="text-xs text-muted-foreground">All classes</span>
				);
			return (
				<span className="text-xs">
					{depts
						.map((d) => d.departmentName ?? "")
						.filter(Boolean)
						.join(", ")}
				</span>
			);
		},
	},
	{
		id: "actions",
		header: "",
		cell: ({ row, table }) => {
			const feeHistoryId = row.original.feeHistory?.[0]?.id;
			const feeId = row.original.id;
			const meta = table.options.meta as FeeTableMeta | undefined;
			if (!feeHistoryId) return null;
			return (
				<div className="flex items-center justify-end gap-2">
					<Button
						size="sm"
						variant="outline"
						className="gap-1.5 text-xs h-7"
						onClick={(e) => {
							e.stopPropagation();
							meta?.onApplyFee?.(feeHistoryId);
						}}
					>
						<Users className="h-3 w-3" />
						Apply to students
					</Button>
					<Menu
						Trigger={
							<Button
								size="icon"
								variant="outline"
								className="h-7 w-7"
								onClick={(e) => e.stopPropagation()}
							>
								<MoreHorizontal className="h-3.5 w-3.5" />
							</Button>
						}
					>
						<Menu.Item
							onClick={(e) => {
								e.stopPropagation();
								meta?.onEditFee?.(feeId);
							}}
						>
							Edit fee
						</Menu.Item>
						<Menu.Item
							onClick={(e) => {
								e.stopPropagation();
								meta?.onDeleteFee?.({
									feeHistoryId,
									title: row.original.title,
								});
							}}
						>
							Remove from this term
						</Menu.Item>
					</Menu>
				</div>
			);
		},
	},
];
