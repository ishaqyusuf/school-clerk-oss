import { useSchoolFeeParams } from "@/hooks/use-school-fee-params";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@school-clerk/ui/sheet";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { Form } from "../forms/school-fee-form";
import { FormContext } from "../school-fee/form-context";

export function SchoolFeeCreateSheet({}) {
  const { createSchoolFee, setParams } = useSchoolFeeParams();
  const isOpen = createSchoolFee;
  if (!isOpen) return null;

  return (
    <FormContext>
      <CustomSheet
        floating
        rounded
        size="lg"
        open={isOpen}
        onOpenChange={() => setParams(null)}
        sheetName="fee"
      >
        <SheetHeader>
          <SheetTitle>Fee Form</SheetTitle>
        </SheetHeader>
        <CustomSheetContent className="flex flex-col gap-2">
          <Form />
        </CustomSheetContent>
      </CustomSheet>
    </FormContext>
  );
}
