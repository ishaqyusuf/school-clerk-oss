import { CollapseForm } from "../collapse-form";
import { useStudentFormContext } from "../students/form-context";
import { FormDate } from "@school-clerk/ui/controls/form-date";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { FormSelect } from "@school-clerk/ui/controls/form-select";

export function StudentBasicInfoForm() {
  const { control } = useStudentFormContext();

  return (
    <div className="flex flex-col gap-4">
      <FormInput name="name" label="First Name" control={control} />
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
  );
}
