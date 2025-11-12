"use client";
import { OpenStudentImport } from "./open-student-import";
import { OpenStudentSheet } from "./open-student-sheet";
import { StudentSearchFilter } from "./student-search-filter";

export function StudentHeader({}) {
  return (
    <div className="flex items-center gap-4 justify-between">
      <StudentSearchFilter />
      <div className="flex-1"></div>

      <OpenStudentImport />
      <OpenStudentSheet />
    </div>
  );
}
