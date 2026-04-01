"use client";

import { AcademicSessionSheet } from "./academic-session-sheet";
import { BillableCreateSheet } from "./billable-create-sheet";
import { ClassroomCreateSheet } from "./classroom-create-sheet";
import { ClassroomOverviewSheet } from "./classroom-overview-sheet";
import { CreateBillSheet } from "./create-bill-sheet";
import { QuestionSheet } from "./question-sheet";
import { SchoolFeeCreateSheet } from "./school-fee-create-sheet";
import { StaffCreateSheet } from "./staff-create-sheet";
import { StaffOverviewSheet } from "./staff-overview-sheet";
import { StudentCreateSheet } from "./student-create-sheet";
import { StudentOverviewSheet } from "./student-overview-sheet";

export function GlobalSheets() {
	return (
		<>
			<AcademicSessionSheet />
			<ClassroomCreateSheet />
			<BillableCreateSheet />
			<SchoolFeeCreateSheet />
			<StudentCreateSheet />
			<StaffCreateSheet />
			<StaffOverviewSheet />
			<StudentOverviewSheet />
			<ClassroomOverviewSheet />
			<CreateBillSheet />
			<QuestionSheet />
			{/* We preload the invoice data (template, invoice number etc) */}
			{/* <Suspense fallback={null}>
        <InvoiceCreateSheetServer teamId={userData?.team_id} />
      </Suspense> */}
		</>
	);
}
