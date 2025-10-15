import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

import { __uuidPri, _uuidRel, timeStamps } from "./schema-helper";

export const School = pgTable(
  "school",
  {
    id: __uuidPri,
    name: varchar("name", { length: 256 }).notNull(),
    // slug: varchar("slug", { length: 256 }).notNull().unique(),
    subDomain: varchar("sub_domain", { length: 256 }).notNull().unique(),
    meta: jsonb("meta").$type<{
      id?: string;
    }>(),
    ...timeStamps,
  },
  (t) => ({
    unq: unique().on(t.name, t.subDomain),
  }),
);
export const CreateSchoolSchema = createInsertSchema(School, {});
export const AcademicSession = pgTable(
  "academic_session",
  {
    id: __uuidPri,
    name: varchar("name", { length: 256 }).notNull(),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    schoolId: _uuidRel("school_id", School.id).notNull(),
    ...timeStamps,
  },
  (t) => ({
    unq: unique().on(t.name, t.schoolId),
  }),
);
export const AcademicTerm = pgTable(
  "academic_term",
  {
    id: __uuidPri,
    name: varchar("name", { length: 256 }).notNull(),
    schoolId: _uuidRel("school_id", School.id).notNull(),
    academicSessionId: _uuidRel("academic_session_id", AcademicSession.id),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    ...timeStamps,
  },
  (t) => ({
    unq: unique().on(t.name, t.schoolId, t.academicSessionId),
  }),
);

export const AcademicClass = pgTable(
  "academic_class",
  {
    id: __uuidPri,
    name: varchar("name", { length: 256 }).notNull(),
    schoolId: _uuidRel("school_id", School.id).notNull(),
    classLevel: integer("classLevel").notNull().default(1),
    ...timeStamps,
  },
  (t) => ({
    unq: unique().on(t.name, t.schoolId),
  }),
);
export const AcademicSubClass = pgTable(
  "academic_sub_class",
  {
    id: __uuidPri,
    name: varchar("name", { length: 256 }).notNull(),
    schoolId: _uuidRel("school_id", School.id).notNull(),
    academicClassId: _uuidRel("academic_class_id", AcademicClass.id).notNull(),
  },
  (t) => ({
    unq: unique().on(t.name, t.schoolId),
  }),
);
export const Subjects = pgTable(
  "Subjects",
  {
    id: __uuidPri,
    name: varchar("name", { length: 256 }).notNull(),
    schoolId: _uuidRel("school_id", School.id).notNull(),
    ...timeStamps,
  },
  (t) => ({
    unq: unique().on(t.name, t.schoolId),
  }),
);
export const SessionClass = pgTable(
  "session_class",
  {
    id: __uuidPri,
    schoolId: _uuidRel("school_id", School.id).notNull(),
    academicSessionId: _uuidRel("academic_session_id", AcademicSession.id),
    academicSubClassId: _uuidRel("academic_sub_class_id", AcademicSubClass.id),
    ...timeStamps,
  },
  (t) => ({
    unq: unique().on(t.academicSubClassId, t.schoolId, t.academicSessionId),
  }),
);
export const ClassSubject = pgTable(
  "class_subject",
  {
    id: __uuidPri,
    schoolId: _uuidRel("school_id", School.id).notNull(),
    academicSessionId: _uuidRel("academic_session_id", AcademicSession.id),
    academicSubClassId: _uuidRel("academic_sub_class_id", AcademicSubClass.id),
    sessionClassId: _uuidRel("session_class_id", SessionClass.id),
    subjectId: _uuidRel("subject_id", Subjects.id),
    ...timeStamps,
  },
  (t) => ({
    unq: unique().on(t.sessionClassId, t.subjectId),
  }),
);
