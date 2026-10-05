import {
  approveEnrollmentApplication,
  createOrUpdateEnrollmentLink,
  getEnrollmentApplications,
  listEnrollmentLinks,
  rejectEnrollmentApplication,
  setEnrollmentLinkStatus,
} from "@api/db/queries/enrollment-links";
import {
  approveEnrollmentApplicationSchema,
  createOrUpdateEnrollmentLinkSchema,
  getEnrollmentApplicationsSchema,
  rejectEnrollmentApplicationSchema,
  setEnrollmentLinkStatusSchema,
} from "../schemas/enrollment-links";
import {
  createTRPCRouter,
  moduleProcedure,
} from "../init";
import { TRPCError } from "@trpc/server";

const admissionProcedure = moduleProcedure(["ADMISSION_ENROLLMENT"]);

export const enrollmentLinksRouter = createTRPCRouter({
  listLinks: admissionProcedure.query(({ ctx }) => {
    return listEnrollmentLinks(ctx);
  }),
  createOrUpdateLink: admissionProcedure
    .input(createOrUpdateEnrollmentLinkSchema)
    .mutation(({ ctx, input }) => {
      return createOrUpdateEnrollmentLink(ctx, input);
    }),
  setLinkStatus: admissionProcedure
    .input(setEnrollmentLinkStatusSchema)
    .mutation(({ ctx, input }) => {
      if (!input.id || !input.status) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enrollment link id and status are required.",
        });
      }
      return setEnrollmentLinkStatus(ctx, {
        id: input.id,
        status: input.status,
      });
    }),
  getApplications: admissionProcedure
    .input(getEnrollmentApplicationsSchema)
    .query(({ ctx, input }) => {
      return getEnrollmentApplications(ctx, input);
    }),
  approveApplication: admissionProcedure
    .input(approveEnrollmentApplicationSchema)
    .mutation(({ ctx, input }) => {
      return approveEnrollmentApplication(ctx, input);
    }),
  rejectApplication: admissionProcedure
    .input(rejectEnrollmentApplicationSchema)
    .mutation(({ ctx, input }) => {
      if (!input.applicationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Application id is required.",
        });
      }
      return rejectEnrollmentApplication(ctx, {
        applicationId: input.applicationId,
        reason: input.reason,
      });
    }),
});
