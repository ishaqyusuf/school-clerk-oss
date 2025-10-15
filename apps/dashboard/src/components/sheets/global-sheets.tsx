"use client";

import { AcademicSessionSheet } from "./academic-session-sheet";
import { BillableCreateSheet } from "./billable-create-sheet";
import { ClassroomCreateSheet } from "./classroom-create-sheet";
import { ClassroomOverviewSheet } from "./classroom-overview-sheet";
import { CreateBillSheet } from "./create-bill-sheet";
import { QuestionSheet } from "./question-sheet";
import { SchoolFeeCreateSheet } from "./school-fee-create-sheet";
import { StaffCreateSheet } from "./staff-create-sheet";
import { StudentCreateSheet } from "./student-create-sheet";
import { StudentOverviewSheet } from "./student-overview-sheet";

type Props = {
  //   defaultCurrency?: string;
};

export function GlobalSheets({}: Props) {
  return (
    <>
      <AcademicSessionSheet />
      <ClassroomCreateSheet />
      <BillableCreateSheet />
      <SchoolFeeCreateSheet />
      <StudentCreateSheet />
      <StaffCreateSheet />
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
