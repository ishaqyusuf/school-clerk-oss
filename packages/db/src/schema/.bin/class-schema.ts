import { relations } from "drizzle-orm";
import { boolean, decimal, pgTable, text, varchar } from "drizzle-orm/pg-core";

import { __uuidPri, _uuidRel, timeStamps } from "./schema-helper";
import {
  AcademicTerm,
  ClassSubject,
  School,
  SessionClass,
} from "./school-schema";
import { StudentTermSheet } from "./student-schema";
import { User } from "./user-schema";

export const Assessment = pgTable("assessments", {
  id: __uuidPri,
  schoolId: _uuidRel("school_id", School.id).notNull(),
  classSubjectId: _uuidRel("class_subject_id", ClassSubject.id),
  description: varchar("description"),
  obtainable: decimal("obtainable"),
  teacherId: _uuidRel("teacher_id", User.id),
  termId: _uuidRel("term_id", AcademicTerm.id),
  ...timeStamps,
});
export const AssessmentRelations = relations(Assessment, (r) => ({
  results: r.many(AssessmentResult),
}));
export const AssessmentResult = pgTable("assessment_result", {
  id: __uuidPri,
  assessmentId: _uuidRel("assessment_id", Assessment.id),
  score: decimal("score"),
  percentage: decimal("percentage"),
  studentTermSheetId: _uuidRel("student_term_sheet_id", StudentTermSheet.id),
  ...timeStamps,
});

export const StudentDayAttendance = pgTable("student_day_attendance", {
  id: __uuidPri,
  SessionClassId: _uuidRel("session_class_id", SessionClass.id),
  teacherId: _uuidRel("teacher_id", User.id),
  classSubjectId: _uuidRel("class_subject_id", ClassSubject.id), //option
  termId: _uuidRel("term_id", AcademicTerm.id),
  ...timeStamps,
});
export const StudentDayAttendanceRelations = relations(
  StudentDayAttendance,
  (r) => ({
    attendance: r.many(StudentAttendance),
  }),
);
export const StudentAttendance = pgTable("student_attendance", {
  id: __uuidPri,
  attendanceId: _uuidRel("attendance_id", StudentDayAttendance.id),
  present: boolean("present").default(false),
  comment: text("comment"),
  teacherId: _uuidRel("teacher_id", User.id),
  studentTermSheetId: _uuidRel("student_term_sheet_id", StudentTermSheet.id),
  ...timeStamps,
});
