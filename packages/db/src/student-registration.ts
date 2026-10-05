import { canAccessModules, resolveModuleAccess } from "@school-clerk/utils/module-config";
import type { CreateStudentInput } from "@school-clerk/utils/student-create-schema";
import type { Prisma } from "./generated/client";
import { getStudentAcademicReadContext } from "./student-academic-read";
import { getStudentFeePreview } from "./student-fee-preview";

export class StudentRegistrationError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST", message: string) {
    super(message);
    this.name = "StudentRegistrationError";
  }
}

type RegistrationSelection = { schoolSessionId: string | null; sessionTermId: string | null };
type RegistrationGuardian = { id: string } | { create: { name: string; phone: string; phone2: string | null; schoolProfileId: string } } | null;

// Preparation and persistence must share the caller's Serializable transaction.
export async function prepareStudentRegistration(tx: Prisma.TransactionClient, actor: {
  schoolId: string; userId: string; bearer: string;
}, selection: RegistrationSelection, input: CreateStudentInput) {
  const context = await getStudentAcademicReadContext(tx, actor);
  const role = context?.role?.toUpperCase();
  if (!context || !role || !["ADMIN", "REGISTRAR"].includes(role) ||
    !canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["STUDENT_MANAGEMENT"])) {
    throw new StudentRegistrationError("FORBIDDEN", "Student registration requires student management access.");
  }
  const schoolId = context.school.id;
  const billingEnabled = canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["BILLING_FINANCE"]);
  if (!billingEnabled && (input.selectedOptionalFeeItemIds.length || input.feePayments.length)) {
    throw new StudentRegistrationError("FORBIDDEN", "Fees and payments are unavailable while Finance is disabled for this school.");
  }
  const scope = input.submissionScope;
  if (scope && (scope.schoolId !== schoolId || scope.userId !== actor.userId ||
    scope.loginSessionId !== context.loginSessionId || scope.schoolSessionId !== selection.schoolSessionId ||
    scope.sessionTermId !== selection.sessionTermId)) {
    throw new StudentRegistrationError("CONFLICT", "Your registration workspace changed. Reopen the form before saving.");
  }
  if (input.feePayments.some((payment) => payment.amount > 0) && role !== "ADMIN") {
    // Accountant can receive payments but cannot create students; Registrar can
    // register students but cannot receive payments under the existing policy.
    throw new StudentRegistrationError("FORBIDDEN", "Your role cannot receive payments during student registration.");
  }

  let enrollment: { schoolSessionId: string; classroomDepartmentId: string; termIds: string[]; initialTermId: string } | null = null;
  if (input.classRoomId) {
    if (!canAccessModules(resolveModuleAccess(context.school.moduleConfiguration), ["ACADEMIC_PROGRAMS"])) {
      throw new StudentRegistrationError("FORBIDDEN", "Class registration requires academic management access.");
    }
    const schoolSessionId = selection.schoolSessionId;
    const requestedTerms = input.termForms?.length ? input.termForms :
      selection.sessionTermId && schoolSessionId ? [{ sessionTermId: selection.sessionTermId, schoolSessionId }] : [];
    if (!schoolSessionId || !requestedTerms.length) {
      throw new StudentRegistrationError("BAD_REQUEST", "Select an academic session and term before enrolling a student.");
    }
    if (requestedTerms.some((term) => term.schoolSessionId !== schoolSessionId)) {
      throw new StudentRegistrationError("NOT_FOUND", "All registration terms must belong to the selected school session.");
    }
    const termIds = requestedTerms.map((term) => term.sessionTermId);
    const terms = await tx.sessionTerm.findMany({
      where: { id: { in: termIds }, schoolId, sessionId: schoolSessionId, deletedAt: null,
        session: { schoolId, deletedAt: null } },
      select: { id: true, lifecycleStatus: true },
    });
    if (terms.length !== termIds.length) {
      throw new StudentRegistrationError("NOT_FOUND", "Academic terms were not found in this school session.");
    }
    if (terms.some((term) => term.lifecycleStatus === "CLOSED")) {
      throw new StudentRegistrationError("CONFLICT", "A selected academic term is closed. Review the registration terms.");
    }
    const classroom = await tx.classRoomDepartment.findFirst({
      where: { id: input.classRoomId, schoolProfileId: schoolId, deletedAt: null,
        classRoom: { schoolProfileId: schoolId, schoolSessionId, deletedAt: null } },
      select: { id: true },
    });
    if (!classroom) throw new StudentRegistrationError("NOT_FOUND", "Classroom was not found in this school session.");
    const initialTermId = termIds.find((id) => id === selection.sessionTermId) ?? termIds[0]!;
    enrollment = { schoolSessionId, classroomDepartmentId: classroom.id, termIds, initialTermId };
    if (input.selectedOptionalFeeItemIds.length) {
      const fees = await getStudentFeePreview(tx, {
        schoolId, sessionTermId: initialTermId, classroomDepartmentId: classroom.id,
        admissionType: input.admissionType, studentGender: input.gender,
      });
      const optionalIds = new Set(fees.filter((fee) => !fee.collectable).map((fee) => fee.feeHistoryId));
      if (input.selectedOptionalFeeItemIds.some((id) => !optionalIds.has(id))) {
        throw new StudentRegistrationError("CONFLICT", "An optional fee changed or no longer applies. Refresh the fee preview.");
      }
    }
  }

  let guardian: RegistrationGuardian = null;
  const requestedGuardian = input.guardian;
  if (requestedGuardian && (requestedGuardian.id || requestedGuardian.name || requestedGuardian.phone)) {
    const name = requestedGuardian.name ?? "";
    const phone = requestedGuardian.phone ?? "";
    const existing = await tx.guardians.findFirst({
      where: { schoolProfileId: schoolId, deletedAt: {},
        ...(requestedGuardian.id ? { id: requestedGuardian.id } : { name, phone }) },
      select: { id: true, name: true, phone: true, phone2: true, deletedAt: true },
    });
    if (requestedGuardian.id && !existing) {
      throw new StudentRegistrationError("NOT_FOUND", "Guardian was not found in this school.");
    }
    if (existing) {
      if (existing.deletedAt || (requestedGuardian.name !== null && existing.name !== name) ||
        (requestedGuardian.phone !== null && existing.phone !== phone) ||
        (requestedGuardian.phone2 && requestedGuardian.phone2 !== existing.phone2)) {
        throw new StudentRegistrationError("CONFLICT", "This guardian record needs review. Registration cannot restore or change an existing shared contact.");
      }
      guardian = { id: existing.id };
    } else {
      guardian = { create: { name, phone, phone2: requestedGuardian.phone2 || null, schoolProfileId: schoolId } };
    }
  }
  return { schoolId, role: context.role, enrollment, guardian, billingEnabled };
}

type PreparedRegistration = Awaited<ReturnType<typeof prepareStudentRegistration>>;

export async function createPreparedStudentRegistration(tx: Prisma.TransactionClient, prepared: PreparedRegistration, input: CreateStudentInput) {
  const student = await tx.students.create({ data: {
    schoolProfileId: prepared.schoolId, name: input.name, surname: input.surname,
    otherName: input.otherName, gender: input.gender, dob: input.dob,
    guardians: prepared.guardian ? { create: { guardian: "id" in prepared.guardian
      ? { connect: { id: prepared.guardian.id } } : { create: prepared.guardian.create } } } : undefined,
  }, select: { id: true } });
  const enrollment = prepared.enrollment;
  if (enrollment) {
    const sessionForm = await tx.studentSessionForm.create({ data: {
      studentId: student.id, schoolProfileId: prepared.schoolId,
      schoolSessionId: enrollment.schoolSessionId, classroomDepartmentId: enrollment.classroomDepartmentId,
    }, select: { id: true } });
    await tx.studentTermForm.createMany({ data: enrollment.termIds.map((sessionTermId) => ({
      studentId: student.id, studentSessionFormId: sessionForm.id, schoolProfileId: prepared.schoolId,
      schoolSessionId: enrollment.schoolSessionId, sessionTermId,
      classroomDepartmentId: enrollment.classroomDepartmentId, admissionType: input.admissionType,
    })) });
  }
  return tx.students.findFirstOrThrow({
    where: { id: student.id, schoolProfileId: prepared.schoolId, deletedAt: null },
    include: {
      guardians: { where: { deletedAt: null, guardian: { schoolProfileId: prepared.schoolId, deletedAt: null } }, include: { guardian: true } },
      sessionForms: { where: { schoolProfileId: prepared.schoolId, deletedAt: null },
        include: { classroomDepartment: true, termForms: { where: { schoolProfileId: prepared.schoolId, deletedAt: null } } } },
    },
  });
}
