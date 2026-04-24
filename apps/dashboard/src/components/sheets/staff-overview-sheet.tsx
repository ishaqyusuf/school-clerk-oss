"use client";

import { useStaffParams } from "@/hooks/use-staff-params";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { StaffOverviewShell } from "../staff/staff-overview-shell";
import { useState } from "react";

export function StaffOverviewSheet() {
	const { staffViewId, setParams } = useStaffParams();
	const isOpen = Boolean(staffViewId);
	const [activeTab, setActiveTab] = useState("overview");

	if (!isOpen) return null;

	return (
		<CustomSheet
			floating
			rounded
			size="lg"
			open={isOpen}
			onOpenChange={() => {
				setActiveTab("overview");
				setParams({ staffViewId: null, staffViewTab: null });
			}}
			sheetName="staff-overview"
		>
			<CustomSheetContent className="flex flex-col gap-6">
				<StaffOverviewShell
					staffId={staffViewId!}
					mode="sheet"
					activeTab={activeTab}
					onTabChange={setActiveTab}
				/>
			</CustomSheetContent>
		</CustomSheet>
	);
}
