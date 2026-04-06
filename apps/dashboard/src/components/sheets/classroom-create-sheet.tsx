import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
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
  const trpc = useTRPC();
  const { createClassroom, editClassroomId, setParams } = useClassroomParams();
  const isOpen = Boolean(createClassroom || editClassroomId);
  const { data } = useQuery(
    trpc.classrooms.getClassroomStructure.queryOptions(
      { classRoomId: editClassroomId ?? "" },
      { enabled: !!editClassroomId },
    ),
  );

  return (
    <FormContext
      defaultValues={
        data
          ? {
              classRoomId: data.id,
              className: data.className,
              classLevel: data.classLevel,
              hasSubClass: data.hasSubClass,
              progressionMode: data.progressionMode as any,
              departments: data.departments,
            }
          : undefined
      }
    >
      <CustomSheet
        floating
        rounded
        size="lg"
        open={isOpen}
        onOpenChange={() => setParams(null)}
        sheetName="create-classroom"
      >
        <SheetHeader>
          <SheetTitle>{editClassroomId ? "Edit Class" : "Create Classroom"}</SheetTitle>
        </SheetHeader>
        <CustomSheetContent className="flex flex-col gap-2">
          <Form />
        </CustomSheetContent>
      </CustomSheet>
    </FormContext>
  );
}
