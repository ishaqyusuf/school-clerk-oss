import { useClassroomParams } from "@/hooks/use-classroom-params";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@school-clerk/ui/sheet";

import { FormContext } from "../classroom/form-context";
import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { Form } from "../forms/classroom-form";

export function ClassroomCreateSheet({}) {
  const { createClassroom, setParams } = useClassroomParams();
  const isOpen = Boolean(createClassroom);

  return (
    <FormContext>
      <CustomSheet
        floating
        rounded
        size="lg"
        open={isOpen}
        onOpenChange={() => setParams(null)}
        sheetName="create-classroom"
      >
        <SheetHeader>
          <SheetTitle>Create Classroom</SheetTitle>
        </SheetHeader>
        <CustomSheetContent className="flex flex-col gap-2">
          <Form />
        </CustomSheetContent>
      </CustomSheet>
    </FormContext>
  );
}
