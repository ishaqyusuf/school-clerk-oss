import { getParentOverview } from "@api/db/queries/enrollment-links";
import { authenticatedProcedure, createTRPCRouter } from "../init";

export const parentsRouter = createTRPCRouter({
  overview: authenticatedProcedure.query(({ ctx }) => {
    return getParentOverview(ctx);
  }),
});
