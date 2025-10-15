import { useClassroomParams } from "@/hooks/use-classroom-params";

import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";

import { FormContext } from "../classroom/form-context";
import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { AcademicSessionForm } from "../forms/academic-session-form";
import { useAcademicParams } from "@/hooks/use-academic-params";

export function AcademicSessionSheet({}) {
  const { params, setParams } = useAcademicParams();
  const isOpen = Boolean(!!params.academicSessionFormType);

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
          <SheetTitle>Create Academic Term</SheetTitle>
        </SheetHeader>
        <CustomSheetContent className="flex flex-col gap-2">
          <AcademicSessionForm />
        </CustomSheetContent>
      </CustomSheet>
    </FormContext>
  );
}
