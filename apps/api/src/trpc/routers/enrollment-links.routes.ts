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
import { authenticatedProcedure, createTRPCRouter } from "../init";

export const enrollmentLinksRouter = createTRPCRouter({
  listLinks: authenticatedProcedure.query(({ ctx }) => {
    return listEnrollmentLinks(ctx);
  }),
  createOrUpdateLink: authenticatedProcedure
    .input(createOrUpdateEnrollmentLinkSchema)
    .mutation(({ ctx, input }) => {
      return createOrUpdateEnrollmentLink(ctx, input);
    }),
  setLinkStatus: authenticatedProcedure
    .input(setEnrollmentLinkStatusSchema)
    .mutation(({ ctx, input }) => {
      return setEnrollmentLinkStatus(ctx, input);
    }),
  getApplications: authenticatedProcedure
    .input(getEnrollmentApplicationsSchema)
    .query(({ ctx, input }) => {
      return getEnrollmentApplications(ctx, input);
    }),
  approveApplication: authenticatedProcedure
    .input(approveEnrollmentApplicationSchema)
    .mutation(({ ctx, input }) => {
      return approveEnrollmentApplication(ctx, input);
    }),
  rejectApplication: authenticatedProcedure
    .input(rejectEnrollmentApplicationSchema)
    .mutation(({ ctx, input }) => {
      return rejectEnrollmentApplication(ctx, input);
    }),
});
