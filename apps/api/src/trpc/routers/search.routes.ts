import { globalSearchSchema, searchScopeSchema } from "@api/schemas/search";
import { getGlobalSearchResults, getGlobalSearchScope } from "@api/db/queries/global-search";
import { authenticatedProcedure, createTRPCRouter } from "../init";

export const searchRouter = createTRPCRouter({
  scope: authenticatedProcedure.input(searchScopeSchema).query(({ ctx, input }) => getGlobalSearchScope(ctx, input)),
  global: authenticatedProcedure.input(globalSearchSchema).query(({ ctx, input }) => getGlobalSearchResults(ctx, input)),
});
