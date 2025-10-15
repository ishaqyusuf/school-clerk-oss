import { decimal, pgTable, unique, varchar } from "drizzle-orm/pg-core";

// import { Transaction } from "../schema";
import { __uuidPri, _uuidRel, timeStamps } from "./schema-helper";
import {
  AcademicSession,
  AcademicTerm,
  School,
  SessionClass,
} from "./school-schema";
import { StudentSessionSheet } from "./student-schema";
import { User } from "./user-schema";

// import { User } from "./user-schema";
export const StaffSessionScheet = pgTable(
  "staff_session_form",
  {
    id: __uuidPri,
    schoolId: _uuidRel("school_id", School.id).notNull(),
    staffId: _uuidRel("staff_id", User.id).notNull(),
    sessionId: _uuidRel("session_id", AcademicSession.id),
    ...timeStamps,
  },
  (t) => ({
    unq: unique().on(t.schoolId, t.staffId, t.sessionId),
  }),
);
export const StaffTermSheet = pgTable("staff_term_sheet", {
  id: __uuidPri,
  schoolId: _uuidRel("school_id", School.id).notNull(),
  staffId: _uuidRel("staff_id", User.id).notNull(),
  sessionSheetId: _uuidRel(
    "session_sheet_id",
    StudentSessionSheet.id,
  ).notNull(),
  termId: _uuidRel("academic_term_id", AcademicTerm.id).notNull(),
  ...timeStamps,
});

export const BillableService = pgTable("billable_service", {
  id: __uuidPri,
  schoolId: _uuidRel("school_id", School.id).notNull(),
  title: varchar("title"),
  amount: decimal("amount").notNull(),
  ...timeStamps,
});

export const StaffClassRole = pgTable("staff_class_role", {
  id: __uuidPri,
  staffId: _uuidRel("staff_id", User.id),
  sessionClassId: _uuidRel("session_class_id", SessionClass.id),
  role: varchar("role"),
  ...timeStamps,
});

export const StaffSubjectRole = pgTable("staff_subject_role", {
  id: __uuidPri,
  staffClassRoleId: _uuidRel("staff_class_role_id", StaffClassRole.id),
  role: varchar("role"),
  ...timeStamps,
});
