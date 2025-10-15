import { useClassroomParams } from "@/hooks/use-classroom-params";

import { SubjectForm, SubjectFormAction } from "./forms/subject-form";
import Sheet from "@school-clerk/ui/custom/sheet";
import { FormSkeleton } from "@school-clerk/ui/custom/form-skeleton";

export function ClassroomSubjectSecondaryForm() {
  const ctx = useClassroomParams();
  if (ctx.secondaryTab != "subject-form") return null;
  return (
    <Sheet.SecondaryContent>
      <Sheet.SecondaryHeader
        title={"New Subject"}
        description={"Create a new subject"}
      />
      <Sheet.Content className="">
        <SubjectForm>
          {/* <Sheet.SecondaryFooter className="border-t"> */}
          <div className="flex justify-end">
            <SubjectFormAction />
          </div>
          {/* </Sheet.SecondaryFooter> */}
        </SubjectForm>
      </Sheet.Content>
    </Sheet.SecondaryContent>
  );
}
