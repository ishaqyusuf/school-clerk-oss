import { z } from "zod";
import { createStudentObjectSchema, guardianSchema } from "./student-create-schema";
import { deleteStudentSchema } from "./student-delete-schema";

const studentIdentitySchema = z.object({ id: deleteStudentSchema.shape.studentId, viewScope: deleteStudentSchema.shape.viewScope });
export const changeStudentGenderSchema = studentIdentitySchema.extend({ gender: createStudentObjectSchema.shape.gender });
export const updateStudentBasicProfileSchema = studentIdentitySchema.extend({
  data: createStudentObjectSchema.pick({ gender: true, name: true, surname: true, otherName: true, dob: true }).extend({
    guardian: guardianSchema.optional().nullable(),
  }),
}).superRefine(({ data }, ctx) => {
  const guardian = data.guardian;
  if (guardian && ((!!guardian.name !== !!guardian.phone) || (!!guardian.phone2 && !guardian.name))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data", "guardian"], message: "Enter both guardian name and primary phone, or clear all contact fields to remove the link." });
  }
});
export const studentProfileUpdateSchema = z.union([updateStudentBasicProfileSchema, changeStudentGenderSchema]);
export type UpdateStudentBasicProfileInput = z.infer<typeof updateStudentBasicProfileSchema>;
export type ChangeStudentGenderInput = z.infer<typeof changeStudentGenderSchema>;
export type StudentProfileUpdateInput = z.infer<typeof studentProfileUpdateSchema>;
