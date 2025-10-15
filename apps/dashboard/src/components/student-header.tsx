"use client";
import { OpenStudentSheet } from "./open-student-sheet";
import { StudentSearchFilter } from "./student-search-filter";

export function StudentHeader({}) {
  return (
    <div className="flex items-center justify-between">
      <StudentSearchFilter />

      <div className="">
        <OpenStudentSheet />
      </div>
    </div>
  );
}
