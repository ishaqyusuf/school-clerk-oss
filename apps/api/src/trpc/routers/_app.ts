import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../init";
import { studentsRouter } from "./students.routes";
import { subjectsRouter } from "./subjects.routes";
import { questionsRouter } from "./question.routes";
import { classroomRouter } from "./classroom.routes";
import { enrollmentsRouter } from "./enrollment.routes";
import { academicsRouter } from "./academics.routes";
import { ftdRouter } from "./ftd.routes";
import { authRouter } from "./auth.routes";
import { transactionRoutes } from "./transaction.routes";
import { filtersRoutes } from "./filters.route";
import { assessmentRouter } from "./assessment.routes";
export const appRouter = createTRPCRouter({
  assessments: assessmentRouter,
  auth: authRouter,
  students: studentsRouter,
  enrollments: enrollmentsRouter,
  subjects: subjectsRouter,
  questions: questionsRouter,
  classrooms: classroomRouter,
  academics: academicsRouter,
  transactions: transactionRoutes,
  ftd: ftdRouter,
  filters: filtersRoutes,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
