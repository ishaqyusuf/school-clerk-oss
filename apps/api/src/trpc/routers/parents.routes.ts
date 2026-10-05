import { getParentOverview } from "@api/db/queries/enrollment-links";
import {
  createTRPCRouter,
  moduleProcedure,
} from "../init";

const parentProcedure = moduleProcedure(["PARENT_PORTAL"]);

export const parentsRouter = createTRPCRouter({
  overview: parentProcedure.query(({ ctx }) => {
    return getParentOverview(ctx);
  }),
});
