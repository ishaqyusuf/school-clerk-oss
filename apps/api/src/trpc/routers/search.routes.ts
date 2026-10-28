import { globalSearchSchema, searchScopeSchema } from "@api/schemas/search";
import { getGlobalSearchResults, getGlobalSearchScope } from "@api/db/queries/global-search";
import { authenticatedProcedure, createTRPCRouter } from "../init";

// Dashboard also compiles this source with strictNullChecks disabled. Explicit
// projections retain required output fields there without weakening validation.
function searchScope(input: Parameters<typeof searchScopeSchema.parse>[0]) {
  const data = searchScopeSchema.parse(input);
  return {
    schoolId: searchScopeSchema.shape.schoolId.parse(data.schoolId),
    userId: searchScopeSchema.shape.userId.parse(data.userId),
    loginSessionId: searchScopeSchema.shape.loginSessionId.parse(data.loginSessionId),
    sessionId: searchScopeSchema.shape.sessionId.parse(data.sessionId),
  };
}

function searchInput(input: Parameters<typeof globalSearchSchema.parse>[0]) {
  const data = globalSearchSchema.parse(input);
  return {
    ...searchScope(data),
    accessKey: globalSearchSchema.shape.accessKey.parse(data.accessKey),
    query: globalSearchSchema.shape.query.parse(data.query),
    limit: globalSearchSchema.shape.limit.parse(data.limit),
  };
}

export const searchRouter = createTRPCRouter({
  scope: authenticatedProcedure.input(searchScopeSchema).query(({ ctx, input }) => getGlobalSearchScope(ctx, searchScope(input))),
  global: authenticatedProcedure.input(globalSearchSchema).query(({ ctx, input }) => getGlobalSearchResults(ctx, searchInput(input))),
});
