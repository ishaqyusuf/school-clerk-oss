import { useBillParams } from "@/hooks/use-bill-params";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useStudentParams } from "@/hooks/use-student-params";
import { useTermBillableParams } from "@/hooks/use-term-billable-params";

import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";

import { FormContext } from "../bill/form-context";
import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { Form } from "../forms/bill-form";

export function CreateBillSheet({}) {
  const { createBill, setParams } = useBillParams();
  const isOpen = createBill;
  if (!isOpen) return null;

  return (
    <FormContext>
      <CustomSheet
        floating
        rounded
        size="lg"
        open={isOpen}
        onOpenChange={() => setParams(null)}
        sheetName="create-student"
      >
        <SheetHeader>
          <SheetTitle>Bill Form</SheetTitle>
        </SheetHeader>
        <CustomSheetContent className="flex flex-col gap-2">
          <Form />
        </CustomSheetContent>
      </CustomSheet>
    </FormContext>
  );
}
