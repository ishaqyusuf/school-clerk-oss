import { useMemo, useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

import { studentDisplayName } from "@/utils/utils";

import { Button } from "@school-clerk/ui/button";
import { Label } from "@school-clerk/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@school-clerk/ui/select";

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
import { QuickFill } from "@/components/quick-fill";

interface Props {}
export function Form({}) {
  const { control, handleSubmit, watch, setValue } = useStudentFormContext();
  const trpc = useTRPC();

  const { data: classList } = useQuery(
    trpc.classrooms.getCurrentSessionClassroom.queryOptions()
  );

  const mainClassrooms = useMemo(() => {
    if (!classList?.data) return [];
    const map = new Map<string, { id: string; name: string; studentCount: number; departments: typeof classList.data }>();
    for (const dept of classList.data) {
      if (!dept.classRoom) continue;
      if (!map.has(dept.classRoom.id)) {
        map.set(dept.classRoom.id, {
          id: dept.classRoom.id,
          name: dept.classRoom.name || "",
          studentCount: 0,
          departments: [],
        });
      }
      map.get(dept.classRoom.id)!.departments.push(dept);
      // @ts-ignore - _count might not be typed fully in the router response type, but it is returned
      map.get(dept.classRoom.id)!.studentCount += dept._count?.studentSessionForms || 0;
    }
    return Array.from(map.values());
  }, [classList?.data]);

  const [selectedMainClassId, setSelectedMainClassId] = useState<string>("");

  const handleMainClassChange = (mainClassId: string) => {
    setSelectedMainClassId(mainClassId);
    const mainClass = mainClassrooms.find((c) => c.id === mainClassId);
    if (mainClass?.departments.length === 1) {
      setValue("classRoomId", mainClass.departments[0].id, { shouldValidate: true, shouldDirty: true });
    } else {
      setValue("classRoomId", null, { shouldValidate: true, shouldDirty: true });
    }
  };

  const selectedMainClass = mainClassrooms.find(c => c.id === selectedMainClassId);
  const showSubClassSelect = selectedMainClass && selectedMainClass.departments.length > 5;
  const showSubClassGrid = selectedMainClass && selectedMainClass.departments.length > 1 && selectedMainClass.departments.length <= 5;

  const { setParams, ...params } = useStudentParams();
  const auth = useAuth();
  const name = watch("name");
  const classRoomId = watch("classRoomId");

  useEffect(() => {
    if (classRoomId && classList?.data) {
      const dept = classList.data.find(d => d.id === classRoomId);
      if (dept?.classRoom?.id && dept.classRoom.id !== selectedMainClassId) {
        setSelectedMainClassId(dept.classRoom.id);
      }
    }
  }, [classRoomId, classList?.data]);

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
    <div className="flex flex-col gap-4">
      {process.env.NODE_ENV !== "production" && (
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Student Details</h3>
          <QuickFill name="student" args={{ mainClassrooms }} />
        </div>
      )}
      <FormInput name="name" label="First Name" control={control} />
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
      <div className="space-y-2">
        <Label>Classroom</Label>
        <Select value={selectedMainClassId} onValueChange={handleMainClassChange}>
          <SelectTrigger>
             <SelectValue placeholder="Select Classroom" />
          </SelectTrigger>
          <SelectContent>
            {mainClassrooms.map(c => (
               <SelectItem key={c.id} value={c.id}>{c.name} ({c.studentCount})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showSubClassGrid && (
        <div className="space-y-2">
          <Label>Stream / Sub-class</Label>
          <div className="grid grid-cols-3 gap-4">
            {selectedMainClass!.departments.map((dept) => (
              <Button
                key={dept.id}
                type="button"
                variant={classRoomId === dept.id ? "default" : "outline"}
                onClick={() => setValue("classRoomId", dept.id, { shouldValidate: true, shouldDirty: true })}
                className="h-auto flex-col py-2"
              >
                <span>{dept.departmentName}</span>
                {/* @ts-ignore */}
                <span className="text-xs opacity-70 font-normal mt-1">{dept._count?.studentSessionForms || 0} students</span>
              </Button>
            ))}
          </div>
          <input type="hidden" {...control.register("classRoomId")} />
        </div>
      )}
      {showSubClassSelect && (
        <FormSelect
          control={control}
          name="classRoomId"
          options={selectedMainClass!.departments.map(d => ({
            ...d,
            // @ts-ignore
            displayName: `${d.departmentName} (${d._count?.studentSessionForms || 0})`
          }))}
          valueKey="id"
          label="Stream / Sub-class"
          titleKey="displayName"
        />
      )}
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
      <div className="">
        <CollapseForm label="Initial Payment (Optional)">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              name="initialPayment.amount"
              label="Payment Amount (NGN)"
              type="number"
              control={control}
            />
            <FormSelect
              control={control}
              name="initialPayment.method"
              options={[
                { id: "CASH", title: "Cash" },
                { id: "TRANSFER", title: "Bank Transfer" },
                { id: "POS", title: "POS / Card" },
              ]}
              valueKey="id"
              label="Payment Method"
              titleKey="title"
            />
            <FormInput
              name="initialPayment.reference"
              label="Payment Reference"
              control={control}
            />
            <FormDate
              control={control}
              label="Payment Date"
              name="initialPayment.paymentDate"
            />
          </div>
        </CollapseForm>
      </div>

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
