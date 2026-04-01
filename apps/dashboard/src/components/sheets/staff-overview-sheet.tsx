"use client";

import { useStaffParams } from "@/hooks/use-staff-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@school-clerk/ui/badge";
import {
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@school-clerk/ui/sheet";
import { Skeleton } from "@school-clerk/ui/skeleton";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { Form } from "../forms/staff-form";
import { FormContext } from "../staffs/form-context";

export function StaffOverviewSheet() {
	const { staffViewId, setParams } = useStaffParams();
	const isOpen = Boolean(staffViewId);
	const trpc = useTRPC();
	const { data, isLoading } = useQuery(
		trpc.staff.getFormData.queryOptions(
			{
				staffId: staffViewId || undefined,
			},
			{
				enabled: isOpen,
			},
		),
	);

	if (!isOpen) return null;

	return (
		<CustomSheet
			floating
			rounded
			size="lg"
			open={isOpen}
			onOpenChange={() => setParams({ staffViewId: null, staffViewTab: null })}
			sheetName="staff-overview"
		>
			{isLoading || !data?.staff ? (
				<LoadingSkeleton />
			) : (
				<Content data={data} />
			)}
		</CustomSheet>
	);
}

function Content({ data }) {
	if (!data?.staff) return null;

	return (
		<>
			<SheetHeader>
				<SheetTitle className="flex items-center gap-3">
					<span>{data.staff.name}</span>
					<Badge variant="outline">{data.staff.role}</Badge>
				</SheetTitle>
				<SheetDescription>
					Manage classroom access, subject permissions, and onboarding details
					for this staff member.
				</SheetDescription>
			</SheetHeader>
			<CustomSheetContent className="flex flex-col gap-2">
				<FormContext values={data.staff}>
					<Form staffId={data.staff.id} submitLabel="Save changes" />
				</FormContext>
			</CustomSheetContent>
		</>
	);
}

function LoadingSkeleton() {
	return (
		<>
			<SheetHeader>
				<SheetTitle>
					<Skeleton className="h-6 w-40" />
				</SheetTitle>
				<SheetDescription>
					<Skeleton className="mt-2 h-4 w-full" />
				</SheetDescription>
			</SheetHeader>
			<CustomSheetContent className="flex flex-col gap-4">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
			</CustomSheetContent>
		</>
	);
}
