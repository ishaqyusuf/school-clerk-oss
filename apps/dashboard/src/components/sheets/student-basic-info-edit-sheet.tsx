import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { _trpc } from "@/components/static-trpc";
import { useStudentParams } from "@/hooks/use-student-params";
import { SheetHeader, SheetTitle } from "@school-clerk/ui/sheet";
import Sheet from "@school-clerk/ui/custom/sheet";
import { Skeleton } from "@school-clerk/ui/skeleton";
import { StudentBasicInfoEditAction } from "../forms/student-basic-info-edit-action";
import { StudentBasicInfoForm } from "../forms/student-basic-info-form";
import { FormContext } from "../students/form-context";

export function StudentBasicInfoEditSheet() {
  const { studentEditId, setParams } = useStudentParams();
  const isOpen = Boolean(studentEditId);
  const { data, isLoading } = useQuery(
    _trpc.students.overview.queryOptions(
      {
        studentId: studentEditId || "",
      },
      {
        enabled: isOpen,
      },
    ),
  );
  const defaultValues = useMemo(() => {
    const student = data?.student;

    return {
      name: student?.name || "",
      surname: student?.surname || "",
      otherName: student?.otherName || "",
      gender:
        student?.gender === "Female" ? ("Female" as const) : ("Male" as const),
      dob: toNullableDate(student?.dob),
      classRoomId: null,
      fees: [],
      termForms: [],
      guardian: {
        id: student?.guardian?.id || null,
        name: student?.guardian?.name || null,
        phone: student?.guardian?.phone || null,
        phone2: student?.guardian?.phone2 || null,
      },
    };
  }, [data?.student]);

  const close = () => {
    setParams({
      studentEditId: null,
    });
  };

  if (!isOpen) return null;

  return (
    <FormContext defaultValues={defaultValues}>
      <Sheet
        floating
        rounded
        size="lg"
        open={isOpen}
        onOpenChange={close}
        sheetName="edit-student-basic-info"
      >
        <SheetHeader>
          <SheetTitle>Edit Student Information</SheetTitle>
        </SheetHeader>
        <Sheet.Content className="flex flex-col gap-2">
          {isLoading ? <EditStudentSkeleton /> : <StudentBasicInfoForm />}
        </Sheet.Content>
        <Sheet.Footer className="shrink-0 border-t bg-background py-3">
          {studentEditId ? (
            <StudentBasicInfoEditAction
              studentId={studentEditId}
              onSuccess={close}
            />
          ) : null}
        </Sheet.Footer>
      </Sheet>
    </FormContext>
  );
}

function toNullableDate(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function EditStudentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
