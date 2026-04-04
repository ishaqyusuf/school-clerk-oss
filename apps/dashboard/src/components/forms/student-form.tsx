import { useStudentParams } from "@/hooks/use-student-params";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { FormDate } from "@school-clerk/ui/controls/form-date";
import { FormInput } from "@school-clerk/ui/controls/form-input";
import { FormSelect } from "@school-clerk/ui/controls/form-select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import FormCheckbox from "@/components/controls/form-checkbox";
import { CollapseForm } from "../collapse-form";
import { FindAndEnroll } from "../find-and-enroll";
import { SubmitButton } from "../submit-button";
import { useStudentFormContext } from "../students/form-context";

export function Form() {
  const { control, handleSubmit, watch } = useStudentFormContext();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { setParams } = useStudentParams();
  const auth = useAuth();

  const { data: classList } = useQuery(
    trpc.classrooms.getCurrentSessionClassroom.queryOptions(),
  );

  const createStudentMutation = useMutation(
    trpc.students.createStudent.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Creating enrollment...",
          success: "Student enrollment completed",
          error: "Unable to create enrollment",
        },
      },
      onSuccess() {
        qc.invalidateQueries({ queryKey: trpc.students.index.queryKey() });
        qc.invalidateQueries({ queryKey: trpc.students.studentsRecentRecord.queryKey() });
        setParams({ createStudent: null });
      },
    }),
  );

  const recordInitialPayment = watch("recordInitialPayment");
  const name = watch("name");
  const classRoomId = watch("classRoomId");
  const { data: applicableFeesPreview } = useQuery(
    trpc.academics.previewApplicableFeeHistories.queryOptions(
      {
        sessionTermId: auth?.profile?.termId || "",
        classroomDepartmentId: classRoomId || null,
      },
      {
        enabled: Boolean(auth?.profile?.termId),
      }
    )
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={handleSubmit((data) => createStudentMutation.mutate(data))}
    >
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

        <div className="rounded-lg border border-border p-3">
          <h4 className="text-sm font-medium">Fees that will be applied on save</h4>
          {!applicableFeesPreview?.length ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No active term fees match this class selection.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {applicableFeesPreview.map((fee) => (
                <li key={fee.feeHistoryId} className="rounded-md border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{fee.title}</span>
                    <span className="text-sm">
                      {new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency: "NGN",
                      }).format(fee.amount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {fee.description || "No description"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Scope: {fee.scope} • Stream: {fee.streamName || "Unassigned"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border p-3 space-y-3">
          <FormCheckbox
            control={control}
            name="recordInitialPayment"
            label="Record payment now"
            description="Capture an initial receipt as part of enrollment."
            switchInput
          />

          {recordInitialPayment ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                name="initialPaymentAmount"
                label="Amount"
                control={control}
                type="number"
              />
              <FormSelect
                name="initialPaymentMethod"
                label="Payment Method"
                control={control}
                options={[
                  "Bank Transfer",
                  "Cash",
                  "Card",
                  "Mobile Money",
                ]}
              />
              <FormInput
                name="initialPaymentReference"
                label="Reference"
                control={control}
              />
              <FormDate
                control={control}
                label="Payment Date"
                name="initialPaymentDate"
              />
            </div>
          ) : null}
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

        <div className="flex justify-end">
          <SubmitButton isSubmitting={createStudentMutation.isPending}>
            Save enrollment
          </SubmitButton>
        </div>
    </form>
  );
}
