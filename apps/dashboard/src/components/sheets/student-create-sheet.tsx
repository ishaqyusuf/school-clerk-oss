import { useStudentParams } from "@/hooks/use-student-params";

import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";
import { useMemo } from "react";

import { Form } from "../forms/student-form";
import { StudentFormAction } from "../forms/student-form-action";
import { FormContext } from "../students/form-context";
import Sheet from "@school-clerk/ui/custom/sheet";
export function StudentCreateSheet({}) {
  const { createStudent, createStudentPrefillName, setParams } =
    useStudentParams();
  const isOpen = createStudent;

  const defaultValues = useMemo(
    () => ({
      name: createStudentPrefillName || "",
      surname: "",
      otherName: "",
      gender: "Male" as const,
      dob: null,
      classRoomId: null,
      fees: [],
      termForms: [],
      guardian: {
        id: null,
        name: null,
        phone: null,
        phone2: null,
      },
    }),
    [createStudentPrefillName],
  );

  if (!isOpen) return null;

  return (
    <FormContext defaultValues={defaultValues}>
      <Sheet
        floating
        rounded
        size="lg"
        open={isOpen}
        onOpenChange={() =>
          setParams({
            createStudent: null,
            createStudentPrefillName: null,
            createStudentReturnTo: null,
          })
        }
        sheetName="create-student"
      >
        <SheetHeader>
          <SheetTitle>Student Form</SheetTitle>
        </SheetHeader>
        <Sheet.Content className="flex flex-col gap-2">
          <Form />
        </Sheet.Content>
        <Sheet.Footer className="shrink-0 border-t bg-background py-3">
          <StudentFormAction />
        </Sheet.Footer>
      </Sheet>
    </FormContext>
  );
}
