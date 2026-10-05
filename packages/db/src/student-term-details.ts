import type { DatabaseTransaction } from "./prisma";
import type { Prisma } from "./generated/client";

const previewLimit = 50;
type SectionStatus = "available" | "restricted" | "unavailable";
type Section<Row> = { status: SectionStatus; count: number | null; rows: Row[] };

function withheld<Row>(status: "restricted" | "unavailable"): Section<Row> {
  return { status, count: null, rows: [] };
}

export class StudentTermDetailsError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "CONFLICT", message: string) {
    super(message);
    this.name = "StudentTermDetailsError";
  }
}

type Target = {
  id: string; schoolId: string; studentId: string;
  sessionId: string; termId: string; departmentId: string | null;
};

async function assessmentPreview(db: DatabaseTransaction, target: Target, allowed: boolean) {
  type Row = { id: number; obtained: number | null; assessmentTitle: string | null; subjectTitle: string | null };
  if (!allowed) return withheld<Row>("restricted");
  if (!target.departmentId) return withheld<Row>("unavailable");
  const reference = { studentTermFormId: target.id, deletedAt: null, obtained: { not: null } };
  const where: Prisma.StudentAssessmentRecordWhereInput = {
    ...reference,
    OR: [{ studentId: target.studentId }, { studentId: null }],
    classSubjectAssessment: { deletedAt: null, departmentSubject: {
      deletedAt: null, classRoomDepartmentId: target.departmentId, sessionTermId: target.termId,
      subject: { schoolProfileId: target.schoolId, deletedAt: null },
    } },
  };
  const total = await db.studentAssessmentRecord.count({ where: reference });
  const count = await db.studentAssessmentRecord.count({ where });
  if (count !== total) return withheld<Row>("unavailable");
  const rows = await db.studentAssessmentRecord.findMany({
    where, orderBy: { id: "asc" }, take: previewLimit,
    select: { id: true, obtained: true, classSubjectAssessment: { select: {
      title: true, departmentSubject: { select: { subject: { select: { title: true } } } },
    } } },
  });
  return { status: "available", count, rows: rows.map((row) => ({
    id: row.id, obtained: row.obtained,
    assessmentTitle: row.classSubjectAssessment?.title ?? null,
    subjectTitle: row.classSubjectAssessment?.departmentSubject?.subject.title ?? null,
  })) } satisfies Section<Row>;
}

async function attendancePreview(db: DatabaseTransaction, target: Target, allowed: boolean) {
  type Row = { id: string; status: string; date: Date | null };
  if (!allowed) return withheld<Row>("restricted");
  if (!target.departmentId) return withheld<Row>("unavailable");
  const reference = { studentTermFormId: target.id, deletedAt: null };
  const where: Prisma.StudentAttendanceWhereInput = {
    ...reference, schoolProfileId: target.schoolId, departmentId: target.departmentId,
    classroomAttendance: {
      schoolProfileId: target.schoolId, deletedAt: null,
      departmentId: target.departmentId, sessionTermId: target.termId,
      OR: [
        { departmentSubjectId: null },
        { departmentSubject: {
          deletedAt: null, classRoomDepartmentId: target.departmentId, sessionTermId: target.termId,
          subject: { schoolProfileId: target.schoolId, deletedAt: null },
        } },
      ],
    },
  };
  const total = await db.studentAttendance.count({ where: reference });
  const count = await db.studentAttendance.count({ where });
  if (count !== total) return withheld<Row>("unavailable");
  const rows = await db.studentAttendance.findMany({
    where, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: previewLimit,
    select: { id: true, status: true, isPresent: true, createdAt: true,
      classroomAttendance: { select: { attendanceDate: true } } },
  });
  return { status: "available", count, rows: rows.map((row) => ({
    id: row.id,
    status: row.status ?? (row.isPresent === null ? "UNKNOWN" : row.isPresent ? "PRESENT" : "ABSENT"),
    date: row.classroomAttendance?.attendanceDate ?? row.createdAt,
  })) } satisfies Section<Row>;
}

async function financePreview(db: DatabaseTransaction, target: Target, allowed: boolean) {
  type Charge = { id: string; title: string; amount: string; status: string };
  type Allocation = { id: string; amount: string; date: Date; paymentStatus: string };
  const hidden = (status: "restricted" | "unavailable") => ({
    charges: withheld<Charge>(status), allocations: withheld<Allocation>(status),
  });
  if (!allowed) return hidden("restricted");
  const reference = { studentTermFormId: target.id, deletedAt: null };
  const where: Prisma.FinanceChargeWhereInput = {
    ...reference, schoolProfileId: target.schoolId, payerType: "STUDENT", studentId: target.studentId,
    staffProfileId: null, staffTermProfileId: null, payeeId: null,
    schoolSessionId: target.sessionId, sessionTermId: target.termId,
    stream: { schoolProfileId: target.schoolId, deletedAt: null },
  };
  const total = await db.financeCharge.count({ where: reference });
  const count = await db.financeCharge.count({ where });
  if (count !== total) return hidden("unavailable");
  const charges = await db.financeCharge.findMany({
    where, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: previewLimit,
    select: { id: true, title: true, amount: true, status: true },
  });
  const allocationReference: Prisma.FinancePaymentAllocationWhereInput = { deletedAt: null, charge: where };
  const allocationWhere: Prisma.FinancePaymentAllocationWhereInput = {
    ...allocationReference,
    payment: { schoolProfileId: target.schoolId, deletedAt: null, payerType: "STUDENT",
      studentId: target.studentId, staffProfileId: null, payeeId: null,
      stream: { schoolProfileId: target.schoolId, deletedAt: null } },
  };
  const allocationTotal = await db.financePaymentAllocation.count({ where: allocationReference });
  const allocationCount = await db.financePaymentAllocation.count({ where: allocationWhere });
  let allocations: Section<Allocation> = withheld("unavailable");
  if (allocationCount === allocationTotal) {
    const rows = await db.financePaymentAllocation.findMany({
      where: allocationWhere, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: previewLimit,
      select: { id: true, amount: true, payment: { select: { paymentDate: true, status: true } } },
    });
    allocations = { status: "available", count: allocationCount, rows: rows.map((row) => ({
      id: row.id, amount: row.amount.toFixed(2), date: row.payment.paymentDate, paymentStatus: row.payment.status,
    })) };
  }
  return {
    charges: { status: "available", count, rows: charges.map((row) => ({ ...row, amount: row.amount.toFixed(2) })) } satisfies Section<Charge>,
    allocations,
  };
}

export async function getStudentTermDetailRecords(db: DatabaseTransaction, input: {
  schoolId: string; id: string;
  access: { assessments: boolean; attendance: boolean; finance: boolean };
}) {
  const { schoolId } = input;
  const form = await db.studentTermForm.findFirst({
    where: { id: input.id, schoolProfileId: schoolId, deletedAt: null },
    select: {
      id: true, studentId: true, schoolSessionId: true, sessionTermId: true, classroomDepartmentId: true,
      schoolSession: { select: { schoolId: true, deletedAt: true } },
      sessionTerm: { select: { schoolId: true, sessionId: true, deletedAt: true, lifecycleStatus: true } },
      sessionForm: { select: { studentId: true, schoolProfileId: true, schoolSessionId: true, deletedAt: true } },
      classroomDepartment: { select: { schoolProfileId: true, deletedAt: true,
        classRoom: { select: { schoolProfileId: true, schoolSessionId: true, deletedAt: true } } } },
    },
  });
  if (!form) throw new StudentTermDetailsError("NOT_FOUND", "This term enrollment is no longer available in this school.");
  const studentId = form.studentId ?? form.sessionForm.studentId;
  const department = form.classroomDepartment;
  if (!studentId || form.sessionForm.studentId !== studentId || form.sessionForm.schoolProfileId !== schoolId ||
    form.sessionForm.deletedAt || !form.schoolSessionId || form.sessionForm.schoolSessionId !== form.schoolSessionId ||
    !form.schoolSession || form.schoolSession.schoolId !== schoolId || form.schoolSession.deletedAt ||
    !form.sessionTermId || !form.sessionTerm || form.sessionTerm.schoolId !== schoolId ||
    form.sessionTerm.sessionId !== form.schoolSessionId || form.sessionTerm.deletedAt ||
    (form.classroomDepartmentId && (!department || department.schoolProfileId !== schoolId || department.deletedAt ||
      !department.classRoom || department.classRoom.schoolProfileId !== schoolId || department.classRoom.deletedAt ||
      department.classRoom.schoolSessionId !== form.schoolSessionId))) {
    throw new StudentTermDetailsError("CONFLICT", "The enrollment's ownership or academic links need review.");
  }
  const student = await db.students.findFirst({
    where: { id: studentId, schoolProfileId: schoolId, deletedAt: null },
    select: { id: true, name: true, surname: true, otherName: true },
  });
  if (!student) throw new StudentTermDetailsError("CONFLICT", "The enrollment's student identity needs review.");
  const target: Target = { id: form.id, schoolId, studentId, sessionId: form.schoolSessionId,
    termId: form.sessionTermId, departmentId: form.classroomDepartmentId };
  const assessments = await assessmentPreview(db, target, input.access.assessments);
  const attendance = await attendancePreview(db, target, input.access.attendance);
  const finance = await financePreview(db, target, input.access.finance);
  return { id: form.id, student, canRemove: form.sessionTerm.lifecycleStatus !== "CLOSED",
    previewLimit, assessments, attendance, ...finance };
}
