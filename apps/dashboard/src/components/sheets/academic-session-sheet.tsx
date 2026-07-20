import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";

import { FormContext } from "../classroom/form-context";
import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { AcademicSessionForm } from "../forms/academic-session-form";
import { AcademicTermForm } from "../forms/academic-term-form";
import { useAcademicParams } from "@/hooks/use-academic-params";

export function AcademicSessionSheet({}) {
  const { params, setParams } = useAcademicParams();
  const isOpen = Boolean(!!params.academicSessionFormType);
  const isTermForm = params.academicSessionFormType === "term";

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
          <SheetTitle>
            {isTermForm ? "Create Academic Term" : "Create Academic Session"}
          </SheetTitle>
        </SheetHeader>
        <CustomSheetContent className="flex flex-col gap-2">
          {isTermForm ? <AcademicTermForm /> : <AcademicSessionForm />}
        </CustomSheetContent>
      </CustomSheet>
    </FormContext>
  );
}
