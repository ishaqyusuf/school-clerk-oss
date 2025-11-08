"use client";
import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/custom/icons";
import { useQuestionFormParams } from "@/hooks/use-question-form-params";

export function NewQuestionButton({}) {
  const qParams = useQuestionFormParams();
  return (
    <div className="fixed bottom-0 right-0 z-10">
      <Button
        onClick={(e) => {
          qParams.setParams({
            postId: -1,
          });
        }}
      >
        <Icons.add className="size-4" />
      </Button>
    </div>
  );
}
