"use client";

import { ClassroomAttendance } from "@/components/classroom-attendance";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@school-clerk/ui/select";
import { Label } from "@school-clerk/ui/label";
import { useState } from "react";

type TeacherClassroom = {
  id: string;
  displayName: string;
  studentCount: number;
  subjectCount: number;
};

type Props = {
  classrooms: TeacherClassroom[];
};

export function TeacherAttendanceWorkspace({ classrooms }: Props) {
  const [selectedClassroomId, setSelectedClassroomId] = useState(
    classrooms[0]?.id ?? "",
  );

  if (!classrooms.length) {
    return (
      <section className="border border-dashed bg-background px-4 py-10 text-sm text-muted-foreground">
        No classroom assignments are available for attendance.
      </section>
    );
  }

  const selectedClassroom = classrooms.find(
    (classroom) => classroom.id === selectedClassroomId,
  );

  return (
    <div className="flex min-w-0 flex-col gap-4 sm:gap-6">
      <section className="border bg-background px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid min-w-0 gap-2 sm:max-w-sm sm:flex-1">
            <Label
              htmlFor="teacher-attendance-classroom"
            >
              Classroom
            </Label>
            <Select
              value={selectedClassroomId}
              onValueChange={setSelectedClassroomId}
            >
              <SelectTrigger id="teacher-attendance-classroom">
                <SelectValue placeholder="Select an assigned classroom" />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id}>
                    <span dir="auto">{classroom.displayName}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedClassroom ? (
            <p className="text-sm text-muted-foreground" dir="auto">
              {selectedClassroom.studentCount} students ·{" "}
              {selectedClassroom.subjectCount} subjects
            </p>
          ) : null}
        </div>
      </section>

      <ClassroomAttendance
        departmentId={selectedClassroomId}
        sessionPresentation="dialog"
      />
    </div>
  );
}
