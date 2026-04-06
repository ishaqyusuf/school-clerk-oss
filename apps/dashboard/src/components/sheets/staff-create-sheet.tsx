import { useStaffParams } from "@/hooks/use-staff-params";

import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { Form } from "../forms/staff-form";
import { FormContext } from "../staffs/form-context";

export function StaffCreateSheet() {
	const { createStaff, setParams } = useStaffParams();
	const isOpen = createStaff;
	if (!isOpen) return null;

	return (
		<CustomSheet
			floating
			rounded
			size="lg"
			open={isOpen}
			onOpenChange={() => setParams(null)}
			sheetName="create-staff"
		>
			<SheetHeader>
				<SheetTitle>Invite staff</SheetTitle>
			</SheetHeader>
			<CustomSheetContent className="flex flex-col gap-2">
				<FormContext>
					<Form submitLabel="Send onboarding" closeOnSuccess />
				</FormContext>
			</CustomSheetContent>
		</CustomSheet>
	);
}
