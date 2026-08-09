"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@school-clerk/ui/dialog";
import { Suspense, useState } from "react";
import { AttendanceSessionDetails } from "./attendance-session-details";
import { ClassroomAttendanceCorrectionRecorder } from "./classroom-attendance-form";
import { TableSkeleton } from "./tables/skeleton";

export function AttendanceSessionDialog({
  attendanceId,
  departmentId,
  onClose,
}: {
  attendanceId?: string | null;
  departmentId?: string | null;
  onClose: () => void;
}) {
  const [isCorrecting, setIsCorrecting] = useState(false);

  return (
    <Dialog
      open={Boolean(attendanceId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[95dvh] max-w-5xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-4 text-start sm:px-5">
          <DialogTitle>
            {isCorrecting ? "Correct Attendance" : "Attendance Session"}
          </DialogTitle>
          <DialogDescription>
            {isCorrecting
              ? "Update the recorded attendance for this classroom session"
              : "Review the recorded attendance for this classroom session"}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
          <Suspense fallback={<TableSkeleton />}>
            {isCorrecting ? (
              <ClassroomAttendanceCorrectionRecorder
                attendanceId={attendanceId}
                departmentId={departmentId}
                onSaved={onClose}
              />
            ) : (
              <AttendanceSessionDetails
                attendanceId={attendanceId}
                presentation="dialog"
                onClose={onClose}
                onCorrect={() => setIsCorrecting(true)}
              />
            )}
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
}
