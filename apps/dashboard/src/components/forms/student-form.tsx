import { studentDisplayName } from "@/utils/utils";

import { Button } from "@school-clerk/ui/button";

import { CollapseForm } from "../collapse-form";
import { useStudentFormContext } from "../students/form-context";
import { SubmitButton } from "../submit-button";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useStudentParams } from "@/hooks/use-student-params";
import { useAuth } from "@/hooks/use-auth";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { FormSelect } from "@school-clerk/ui/controls/form-select";
import { FormDate } from "@school-clerk/ui/controls/form-date";
import { ButtonGroup } from "@school-clerk/ui/button-group";
import Sheet from "@school-clerk/ui/custom/sheet";
import { FindAndEnroll } from "../find-and-enroll";

interface Props {}
export function Form({}) {
  const { control, handleSubmit, watch } = useStudentFormContext();
  const trpc = useTRPC();

  const { data: classList } = useQuery(
    trpc.classrooms.getCurrentSessionClassroom.queryOptions()
  );
  // const classList = useAsyncMemo(async () => {
  //   await timeout(randomInt(250));
  //   const profile = await getAuthCookie();

  //   const classList = await getCachedClassRooms(
  //     profile.termId,
  //     profile.sessionId
  //   );
  //   return classList;
  // }, []);

  const { setParams, ...params } = useStudentParams();
  const auth = useAuth();
  const name = watch("name");
  return (
    <div className="flex flex-col gap-4">
      <FormInput name="name" label="Name" control={control} />
      <FindAndEnroll query={name} />
      <div className="grid grid-cols-2 gap-4">
        <FormInput name="surname" label="Surname" control={control} />
        <FormInput name="otherName" label="Other Name" control={control} />
        <FormSelect
          name="gender"
          label="Gender"
          options={["Male", "Female"]}
          control={control}
        />
        <FormDate control={control} label="DoB" name="dob" />
      </div>
      <FormSelect
        control={control}
        name="classRoomId"
        options={classList?.data}
        valueKey="id"
        label="Class"
        titleKey="displayName"
      />
      <div className="">
        <CollapseForm label="Parent">
          <FormInput name="guardian.name" label="Name" control={control} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              name="guardian.phone"
              label="Phone"
              type="phone"
              control={control}
            />
            <FormInput
              name="guardian.phone2"
              type="phone"
              label="Phone 2"
              control={control}
            />
          </div>
        </CollapseForm>
      </div>
      <Sheet.Content>
        <div className="flex flex-col">
          {/* {!data || (
            <div className="flex my-4">
              <div className="">
                <span>{studentDisplayName(data as any)}</span>
              </div>
              <div className="flex-1"></div>
              <Button
                onClick={(e) => {
                  setParams({
                    studentViewId: data.id,
                    studentViewTermId: auth?.profile?.termId,
                    createStudent: null,
                  });
                }}
              >
                View
              </Button>
            </div>
          )} */}
        </div>
      </Sheet.Content>
    </div>
  );
}
