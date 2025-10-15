import { useClassroomParams } from "@/hooks/use-classroom-params";

import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";

import { CustomSheet, CustomSheetContent } from "../custom-sheet-content";
import { useQuestionFormParams } from "@/hooks/use-question-form-params";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { FormContext } from "../questions/form-context";
import { Form } from "../forms/question-form";

export function QuestionSheet({}) {
  const { params, setParams } = useQuestionFormParams();
  const isOpen = Boolean(params.postId);

  return (
    <FormContext>
      <CustomSheet
        floating
        rounded
        size="lg"
        open={isOpen}
        onOpenChange={() => setParams(null)}
        sheetName="question-form"
      >
        <SheetHeader>
          <SheetTitle>Question Form</SheetTitle>
        </SheetHeader>
        <CustomSheetContent className="flex flex-col gap-2">
          <Form />
        </CustomSheetContent>
      </CustomSheet>
    </FormContext>
  );
}
