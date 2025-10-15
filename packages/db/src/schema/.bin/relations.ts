import { relations } from "drizzle-orm";

import {
  BatchStaffService,
  InventorySales,
  StaffService,
  StaffServiceCost,
  Transaction,
} from "./accounting-schema";
import {
  AcademicClass,
  AcademicSession,
  AcademicTerm,
  School,
  SessionClass,
} from "./school-schema";
import {
  BillableService,
  StaffClassRole,
  StaffSubjectRole,
  StaffTermSheet,
} from "./staff-schema";
import {
  Student,
  StudentSessionSheet,
  StudentTermSheet,
} from "./student-schema";
import { Account, Session, User } from "./user-schema";

export const UserRelations = relations(User, ({ many, one }) => ({
  accounts: many(Account),
  staffServices: many(StaffService),
  school: one(School, {
    fields: [User.id],
    references: [School.id],
  }),
}));

export const AccountRelations = relations(Account, ({ one }) => ({
  user: one(User, { fields: [Account.userId], references: [User.id] }),
}));
export const SessionRelations = relations(Session, ({ one }) => ({
  user: one(User, { fields: [Session.userId], references: [User.id] }),
}));

export const StaffClassRoleRelations = relations(
  StaffClassRole,
  ({ many }) => ({
    subjectRoles: many(StaffSubjectRole),
  }),
);
export const AcademicSessionRelations = relations(AcademicSession, (r) => ({
  batchServices: r.many(BatchStaffService),
  terms: r.many(AcademicTerm),
}));
export const AcademicTermRelations = relations(
  AcademicTerm,
  ({ one, many }) => ({
    sheets: many(StudentTermSheet),
    academicSession: one(AcademicSession, {
      fields: [AcademicTerm.id],
      references: [AcademicSession.id],
    }),
  }),
);

export const SessionClassRelations = relations(
  SessionClass,
  ({ one, many }) => ({
    classRoom: one(AcademicClass, {
      fields: [SessionClass.academicSubClassId],
      references: [AcademicClass.id],
    }),
  }),
);
export const StudentRelations = relations(Student, ({ one, many }) => ({
  sessionSheets: many(StudentSessionSheet),
}));
export const StudentSessionRelations = relations(
  StudentSessionSheet,
  ({ one, many }) => ({
    school: one(School, {
      fields: [StudentSessionSheet.schoolId],
      references: [School.id],
    }),
    student: one(Student, {
      fields: [StudentSessionSheet.studentId],
      references: [Student.id],
    }),
    session: one(AcademicSession, {
      fields: [StudentSessionSheet.sessionId],
      references: [AcademicSession.id],
    }),
    terms: many(StudentTermSheet),
  }),
);
export const StudentTermSheetRelation = relations(
  StudentTermSheet,
  ({ one, many }) => ({
    term: one(AcademicTerm, {
      fields: [StudentTermSheet.termId],
      references: [AcademicTerm.id],
    }),
    student: one(Student, {
      fields: [StudentTermSheet.studentId],
      references: [Student.id],
    }),
    sessionClass: one(SessionClass, {
      fields: [StudentTermSheet.sessionClassId],
      references: [SessionClass.id],
    }),
    sessionSheet: one(StudentSessionSheet, {
      fields: [StudentTermSheet.sessionSheetId],
      references: [StudentSessionSheet.id],
    }),
  }),
);
export const StaffTermSheetRelation = relations(StaffTermSheet, (r) => ({
  user: r.one(User, {
    fields: [StaffTermSheet.staffId],
    references: [User.id],
  }),
  services: r.many(StaffService),
}));
export const StaffServiceRelations = relations(StaffService, (r) => ({
  // school: r.one(School, {
  //   fields: [StaffService.schoolId],
  //   references: [School.id],
  // }),
  staff: r.one(User, { fields: [StaffService.staffId], references: [User.id] }),
  staffTx: r.one(Transaction, {
    fields: [StaffService.transactionId],
    references: [Transaction.id],
  }),
  costs: r.many(StaffServiceCost),
  batchService: r.one(BatchStaffService, {
    fields: [StaffService.batchServiceId],
    references: [BatchStaffService.id],
  }),
}));
export const StaffServiceCostRelations = relations(StaffServiceCost, (r) => ({
  service: r.one(StaffService, {
    fields: [StaffServiceCost.serviceId],
    references: [StaffService.id],
  }),
}));
export const BatchStaffServiceRelations = relations(BatchStaffService, (r) => ({
  school: r.one(School, {
    fields: [BatchStaffService.schoolId],
    references: [School.id],
  }),
  session: r.one(AcademicSession, {
    fields: [BatchStaffService.sessionId],
    references: [AcademicSession.id],
  }),
  staffServices: r.many(StaffService),
}));
export const SchoolRelations = relations(School, (r) => ({
  // staffServices: r.many(StaffService),
  batchStaffServices: r.many(BatchStaffService),
}));
export const InventorySalesRelations = relations(InventorySales, (r) => ({
  transaction: r.one(Transaction, {
    fields: [InventorySales.transactionId],
    references: [Transaction.id],
  }),
}));
export const TransactionRelations = relations(Transaction, (r) => ({
  sales: r.many(InventorySales),
  studentTermSheet: r.one(StudentTermSheet, {
    fields: [Transaction.studentTermId],
    references: [StudentTermSheet.id],
  }),
  staffTermSheet: r.one(StaffTermSheet, {
    fields: [Transaction.studentTermId],
    references: [StaffTermSheet.id],
  }),
}));
