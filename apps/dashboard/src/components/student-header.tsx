"use client";
import { OpenStudentImport } from "./open-student-import";
import { OpenStudentSheet } from "./open-student-sheet";
import { StudentSearchFilter } from "./student-search-filter";
import { useStudentParams } from "@/hooks/use-student-params";
import { Button } from "@school-clerk/ui/button";
import { UserPlus, MoreVertical } from "lucide-react";

export function StudentHeader({}) {
  const { setParams } = useStudentParams();
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          Student Management
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage and track all enrolled students
        </p>
      </div>
      <div className="flex items-center gap-3">
        <OpenStudentImport />
        <Button
          onClick={() => setParams({ createStudent: true })}
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Enroll New Student
        </Button>
      </div>
    </div>
  );
}
