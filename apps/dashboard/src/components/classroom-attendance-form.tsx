"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useClassroomParams } from "@/hooks/use-classroom-params";
import { useTRPC } from "@/trpc/client";
import Sheet from "@school-clerk/ui/custom/sheet";
import { Button } from "@school-clerk/ui/button";
import { Input } from "@school-clerk/ui/input";
import { Label } from "@school-clerk/ui/label";
import { SubmitButton } from "./submit-button";
import { format } from "date-fns";
import { TableSkeleton } from "./tables/skeleton";
import { Suspense } from "react";
import { Save } from "lucide-react";

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

function AttendanceFormContent({
  departmentId,
}: {
  departmentId?: string | null;
}) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const { setParams } = useClassroomParams();

  const defaultTitle = format(new Date(), "dd MMM yyyy");
  const [title, setTitle] = useState(defaultTitle);
  const [statusMap, setStatusMap] = useState<
    Record<string, "P" | "A">
  >({});
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});

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

  const handleStatusToggle = (studentId: string, status: "P" | "A") => {
    setStatusMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleCommentChange = (studentId: string, comment: string) => {
    setCommentMap((prev) => ({ ...prev, [studentId]: comment }));
  };

  const handleSubmit = () => {
    mutate({
      departmentId: departmentId!,
      attendanceTitle: title,
      students: students
        .filter((s) => s.termFormId)
        .map((s) => ({
          studentTermFormId: s.termFormId!,
          isPresent: statusMap[s.id] === "P",
          comment: commentMap[s.id] || undefined,
        })),
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
        {/* Quick Actions */}
        <div className="flex items-center justify-between pb-3 border-b">
          <Label className="text-sm font-medium">Students</Label>
          <div className="flex items-center gap-2 bg-card p-1 pr-3 rounded-lg border border-border shadow-sm">
            <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider ml-2 mr-1">
              Mark All
            </span>
            <button
              type="button"
              className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 transition-colors"
              onClick={() => {
                const all: Record<string, "P" | "A"> = {};
                students.forEach((s) => {
                  all[s.id] = "P";
                });
                setStatusMap(all);
              }}
            >
              Present
            </button>
            <button
              type="button"
              className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-muted text-muted-foreground border border-border hover:bg-muted/80 transition-colors"
              onClick={() => setStatusMap({})}
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
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm mt-2">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    Student
                  </th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground text-center">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-muted-foreground">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((student) => {
                  const status = statusMap[student.id];
                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-muted/30 transition-colors ${
                        status === "A"
                          ? "bg-red-50/30 dark:bg-red-900/5"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {getInitials(student.studentName)}
                          </div>
                          <p className="font-medium text-foreground text-sm truncate">
                            {student.studentName}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <div className="inline-flex p-1 bg-muted/50 rounded-lg border border-border">
                            <button
                              type="button"
                              className={`w-9 h-8 rounded-md text-xs font-medium transition-all ${
                                status === "P"
                                  ? "bg-background shadow-sm text-emerald-600 ring-1 ring-black/5 font-bold"
                                  : "text-muted-foreground hover:bg-background/50"
                              }`}
                              onClick={() =>
                                handleStatusToggle(student.id, "P")
                              }
                            >
                              P
                            </button>
                            <button
                              type="button"
                              className={`w-9 h-8 rounded-md text-xs font-medium transition-all ${
                                status === "A"
                                  ? "bg-red-500 text-white shadow-sm font-bold"
                                  : "text-muted-foreground hover:bg-background/50"
                              }`}
                              onClick={() =>
                                handleStatusToggle(student.id, "A")
                              }
                            >
                              A
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-full bg-transparent border-0 border-b border-border focus:border-primary focus:ring-0 text-sm px-0 py-1 placeholder:text-muted-foreground/50 text-foreground transition-colors outline-none"
                          placeholder="Add note..."
                          type="text"
                          value={commentMap[student.id] || ""}
                          onChange={(e) =>
                            handleCommentChange(student.id, e.target.value)
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
          <Save className="h-4 w-4 mr-1" />
          Save Attendance
        </SubmitButton>
      </Sheet.SecondaryFooter>
    </div>
  );
}
