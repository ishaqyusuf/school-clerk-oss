import { useStudentParams } from "@/hooks/use-student-params";

import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { Form } from "../forms/student-form";
import { FormContext } from "../students/form-context";
import Sheet from "@school-clerk/ui/custom/sheet";
export function StudentCreateSheet({}) {
  const { createStudent, setParams } = useStudentParams();
  const isOpen = createStudent;
  if (!isOpen) return null;

  return (
    <FormContext>
      <Sheet
        floating
        rounded
        size="lg"
        open={isOpen}
        onOpenChange={() => setParams(null)}
        sheetName="create-student"
      >
        <SheetHeader>
          <SheetTitle>Student Form</SheetTitle>
        </SheetHeader>
        <Sheet.Content className="flex flex-col gap-2">
          <Form />
        </Sheet.Content>
      </Sheet>
    </FormContext>
  );
}
