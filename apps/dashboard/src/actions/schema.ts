import { z } from "zod";

export const createAcadSessionSchema = z.object({
  title: z.string().min(1),
  terms: z
    .array(
      z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        title: z.string().min(1),
      })
    )
    .optional(),
});
export const deleteSchema = z.object({
  id: z.string(),
});
export const deleteStudentSchema = z.object({
  studentId: z.string(),
});
export const studentFeePaymentSchema = z.object({
  studentFeeId: z.string(),
  amount: z.number(),
  paymentType: z.string(),
  termFormId: z.string(),
});
export const guardianSchema = z.object({
  id: z.string().optional().nullable(),
  phone: z.string().nullable(),
  phone2: z.string().optional().nullable(),
  name: z.string().nullable(),
});
export const studentFeeSchema = z.object({
  feeId: z.string(),
  title: z.string().optional(),
  amount: z.number().optional(),
  paid: z.number().optional(),
  studentTermId: z.string().optional(),
  studentId: z.string().optional(),
});
export const createStudentAcademicProfileSchema = z.object({
  termIds: z.array(
    z.object({
      sessionTermId: z.string(),
      schoolSessionId: z.string(),
    })
  ),
  studentId: z.string(),
  sessionId: z.string(),
  sessionFormId: z.string().optional(),
  classroomDepartmentId: z.string(),
});
export const createStudentSchema = z.object({
  name: z.string().min(1),
  surname: z.string().min(1),
  otherName: z.string().optional().nullable(),
  gender: z.enum(["Male", "Female"]),
  dob: z.date().nullable(),
  classRoomId: z.string().nullable(),
  fees: z.array(studentFeeSchema).optional(),
  guardian: guardianSchema.optional().nullable(),
  termForms: z
    .array(
      z.object({
        sessionTermId: z.string(),
        schoolSessionId: z.string(),
      })
    )
    .optional()
    .nullable(),
});
export const createStaffSchema = z.object({
  title: z.string(),
  name: z.string().min(0),
  email: z.string().optional(),
  phone: z.string().optional(),
  phone2: z.string().optional(),
  address: z.string().optional(),
});
export const createSubjectSchema = z.object({
  title: z.string(),
  // description: z.string().optional(),
  // amount: z.number(),
});
export const createSchoolFeeSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  amount: z.number(),
});
export const createBillSchema = z.object({
  title: z.string().min(1),
  amount: z.number().min(1),
  billableId: z.string().optional(),
  selectedBillableId: z.string().optional(),
  billableHistoryId: z.string().optional(),
  staffTermProfileId: z.string().optional(),
  description: z.string().optional(),
});
export const createBillableSchema = z.object({
  title: z.string().min(1),
  amount: z.number().min(1),
  description: z.string().optional(),
  type: z.enum(["SALARY", "MISC", "OTHER"]).default("OTHER"),
});
export const createClassroomSchema = z.object({
  className: z.string().min(1),
  departments: z
    .array(
      z
        .object({
          name: z.string(),
          departmentLevel: z.number().optional().nullable(),
        })
        .optional()
    )
    .optional(),
});
export const createSignupSchema = (t: any) =>
  z.object({
    institutionName: z.string().min(2, {
      message: "Institution name must be at least 2 characters.",
    }),
    institutionType: z
      .string({
        required_error: "Please select an institution type.",
      })
      .optional(),
    adminName: z.string().min(2, {
      message: "Name must be at least 2 characters.",
    }),
    email: z.string().email({
      message: "Please enter a valid email address.",
    }),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters.",
    }),
    studentCount: z
      .string()
      // .min(1, {
      //   message: "Please enter approximate number of students.",
      // })
      .optional(),
    country: z
      .string()
      // .min(1, {
      //   message: "Please select your country/region.",
      // })
      .optional(),
    phone: z.string().optional(),
    educationSystem: z.string().optional(),
    curriculumType: z.string().optional(),
    languageOfInstruction: z.string().optional(),
    // Add to the schema (inside createSignupSchema function)
    domainName: z
      .string()
      .min(2, {
        message: "Subdomain must be at least 2 characters.",
      })
      .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i, {
        message: "Domain can only contain letters, numbers, and hyphens.",
      }),
  });
