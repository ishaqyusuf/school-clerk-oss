import { useTermBillableParams } from "@/hooks/use-term-billable-params";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@school-clerk/ui/sheet";

import { FormContext } from "../billable/form-context";
import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { Form } from "../forms/billable-form";

export function BillableCreateSheet({}) {
  const { createTermBillable, setParams } = useTermBillableParams();
  const isOpen = createTermBillable;
  if (!isOpen) return null;

  return (
    <FormContext>
      <CustomSheet
        floating
        rounded
        size="lg"
        open={isOpen}
        onOpenChange={() => setParams(null)}
        sheetName="billable"
      >
        <SheetHeader>
          <SheetTitle>Create Billable</SheetTitle>
        </SheetHeader>
        <CustomSheetContent className="flex flex-col gap-2">
          <Form />
        </CustomSheetContent>
      </CustomSheet>
    </FormContext>
  );
}
