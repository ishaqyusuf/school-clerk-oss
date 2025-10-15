import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { Transaction } from "./accounting-schema";
import { BillableService } from "./staff-schema";
import { Student } from "./student-schema";
import { User } from "./user-schema";

export const CreateStaffSchema = createInsertSchema(User, {}).omit({});
export const CreateBillableServiceSchema = createInsertSchema(
  BillableService,
  {}
).omit({});
export const CreateStudentSchema = createInsertSchema(Student)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  })
  .extend({
    extras: z.object({
      sessionClassId: z.string(),
      payments: z.object({
        form: z.boolean().default(false),
        schoolFee: z.boolean().default(false),
        schoolFeeAmount: z.string().optional(),
        uniform: z.boolean(),
        uniformAmount: z.number().optional(),
      }),
    }),
  });
export const CreatePaymentSchema = createInsertSchema(Transaction).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
