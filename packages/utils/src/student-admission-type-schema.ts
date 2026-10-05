import { z } from "zod";
import { bulkChangeStudentClassSchema, changeStudentClassSchema } from "./student-class-change-schema";

export const studentAdmissionTypeSchema = z.enum(["UNCLASSIFIED", "NEW_ADMISSION", "RETURNING"]);
export const setStudentAdmissionTypeSchema = changeStudentClassSchema.pick({
  studentTermFormId: true, viewScope: true,
}).extend({ admissionType: studentAdmissionTypeSchema });
export const bulkSetStudentAdmissionTypeSchema = bulkChangeStudentClassSchema.pick({
  studentTermFormIds: true, viewScope: true,
}).extend({ admissionType: studentAdmissionTypeSchema });
export type SetStudentAdmissionTypeInput = z.infer<typeof setStudentAdmissionTypeSchema>;
export type BulkSetStudentAdmissionTypeInput = z.infer<typeof bulkSetStudentAdmissionTypeSchema>;
