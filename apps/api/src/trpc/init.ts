import type { Context } from "hono";
import { prisma, type Database } from "@school-clerk/db";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { withPrimaryReadAfterWrite } from "./middleware/primary-read-after-write";

export type TRPCContext = {
  //   session: Session | null;
  //   supabase: SupabaseClient;
  db: Database;
  profile: {
    sessionId?;
    schoolId?;
    termId?;
    authSessionId?;
    domain?;
  };
  //   geo: ReturnType<typeof getGeoContext>;
  //   teamId?: string;
};
export const createTRPCContext = async (
  _: unknown,
  c: Context
): Promise<TRPCContext> => {
  const authSessionId = c.req.header("Authorization")?.split(" ")[1];
  let host = decodeURIComponent(c.req.header()["host"] || "");
  if (process.env.NODE_ENV == "development") {
    host = host?.replaceAll(`.${process.env.APP_ROOT_DOMAIN}`, ".vercel.app");
  }
  const [termId, sessionId, schoolId] = (
    c.req.header()["x-ttss-id"] ?? ""
  )?.split("|");
  const db = prisma;
  const profile = {
    termId,
    sessionId,
    schoolId,
    authSessionId,
    domain: host?.replace(`.${process.env.APP_ROOT_DOMAIN}`, ""),
  };

  return {
    db,
    profile,
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
const withPrimaryDbMiddleware = t.middleware(async (opts) => {
  return withPrimaryReadAfterWrite({
    ctx: opts.ctx,
    type: opts.type,
    next: opts.next,
  });
});
// const withTeamPermissionMiddleware = t.middleware(async (opts) => {
//   return withTeamPermission({
//     ctx: opts.ctx,
//     next: opts.next,
//   });
// });

export const publicProcedure = t.procedure.use(withPrimaryDbMiddleware);
