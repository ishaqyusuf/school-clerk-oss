import { Button } from "@school-clerk/ui/button";
import { Icons } from "@school-clerk/ui/custom/icons";
import { Collapsible } from "@school-clerk/ui/composite";
import Portal from "@school-clerk/ui/custom/portal";
import { SubjectForm, SubjectFormAction } from "./forms/subject-form";
import { _qc, _trpc } from "./static-trpc";
import { useState } from "react";

export function ClassroomSubjectHeader({ departmentId }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-4 flex-col">
      <div className="flex-1 flex">
        <div className="flex-1"></div>
        {/* <Button>
        <Icons.add className="size-4 mr-2" />
        Subject
      </Button> */}
        <div id="buttonSlot"></div>
      </div>
      <Collapsible open={open} onOpenChange={setOpen}>
        <Portal nodeId={"buttonSlot"}>
          <Collapsible.Trigger asChild>
            <Button>
              <Icons.add className="size-4" />
            </Button>
          </Collapsible.Trigger>
        </Portal>
        <Collapsible.Content>
          <SubjectForm
            defaultValues={{
              departmentId,
            }}
          >
            <div className="flex justify-end">
              <SubjectFormAction
                onSuccess={(e) => {
                  _qc.invalidateQueries({
                    queryKey: _trpc.subjects.getSubjects.infiniteQueryKey({}),
                  });
                }}
              />
            </div>
          </SubjectForm>
        </Collapsible.Content>
      </Collapsible>
    </div>
  );
}
