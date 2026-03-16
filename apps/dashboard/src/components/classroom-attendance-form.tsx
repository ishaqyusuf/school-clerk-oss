"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useTRPC } from "@/trpc/client";
import Sheet from "@school-clerk/ui/custom/sheet";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { Checkbox } from "@school-clerk/ui/checkbox";
import { SubmitButton } from "./submit-button";
import { format } from "date-fns";
import { TableSkeleton } from "./tables/skeleton";
import { Suspense } from "react";

export function ClassroomAttendanceForm() {
  const { secondaryTab, viewClassroomId, setParams } = useClassroomParams();
  if (secondaryTab !== "attendance-form") return null;
  return (
    <Sheet.SecondaryContent>
      <Sheet.SecondaryHeader>
        <Sheet.Header className="bg-background flex-row items-start gap-4 space-y-0">
          <div className="grid gap-2">
            <Sheet.Title>Take Attendance</Sheet.Title>
            <Sheet.Description>
              Mark students as present or absent
            </Sheet.Description>
          </div>
        </Sheet.Header>
      </Sheet.SecondaryHeader>
      <Sheet.Content>
        <Suspense fallback={<TableSkeleton />}>
          <AttendanceFormContent departmentId={viewClassroomId} />
        </Suspense>
      </Sheet.Content>
    </Sheet.SecondaryContent>
  );
}

function AttendanceFormContent({ departmentId }: { departmentId?: string | null }) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { setParams } = useClassroomParams();

  const defaultTitle = format(new Date(), "dd MMM yyyy");
  const [title, setTitle] = useState(defaultTitle);
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});

  const { data: studentsData } = useQuery(
    trpc.students.index.queryOptions(
      { departmentId },
      { enabled: !!departmentId }
    )
  );

  const students = studentsData?.data ?? [];

  const { mutate, isPending } = useMutation(
    trpc.attendance.takeAttendance.mutationOptions({
      meta: {
        toastTitle: {
          loading: "Saving attendance...",
          success: "Attendance recorded",
          error: "Failed to save attendance",
        },
      },
      onSuccess() {
        qc.invalidateQueries({
          queryKey: trpc.attendance.getClassroomAttendance.queryKey({
            departmentId: departmentId || "-",
          }),
        });
        setParams({ secondaryTab: null });
      },
    })
  );

  const handleToggle = (studentId: string, checked: boolean) => {
    setPresentMap((prev) => ({ ...prev, [studentId]: checked }));
  };

  const handleSubmit = () => {
    mutate({
      departmentId: departmentId!,
      attendanceTitle: title,
      students: students
        .filter((s) => s.termFormId)
        .map((s) => ({
          studentTermFormId: s.termFormId!,
          isPresent: presentMap[s.id] ?? false,
        })),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-2">
        <Label htmlFor="attendance-title">Session Title</Label>
        <Input
          id="attendance-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Monday Morning"
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between pb-2 border-b">
          <Label className="text-sm font-medium">Students</Label>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              className="underline"
              onClick={() => {
                const all: Record<string, boolean> = {};
                students.forEach((s) => { all[s.id] = true; });
                setPresentMap(all);
              }}
            >
              All present
            </button>
            <button
              type="button"
              className="underline"
              onClick={() => setPresentMap({})}
            >
              Clear
            </button>
          </div>
        </div>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No students enrolled in this class.
          </p>
        ) : (
          <div className="divide-y max-h-[60vh] overflow-y-auto">
            {students.map((student) => (
              <div key={student.id} className="flex items-center gap-3 py-2">
                <Checkbox
                  id={`student-${student.id}`}
                  checked={presentMap[student.id] ?? false}
                  onCheckedChange={(checked) =>
                    handleToggle(student.id, Boolean(checked))
                  }
                />
                <Label
                  htmlFor={`student-${student.id}`}
                  className="flex-1 cursor-pointer text-sm"
                >
                  {student.studentName}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet.SecondaryFooter>
        <Button
          variant="outline"
          type="button"
          onClick={() => setParams({ secondaryTab: null })}
        >
          Cancel
        </Button>
        <SubmitButton
          isSubmitting={isPending}
          onClick={handleSubmit}
          disabled={students.length === 0 || !title}
        >
          Save Attendance
        </SubmitButton>
      </Sheet.SecondaryFooter>
    </div>
  );
}
