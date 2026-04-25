import type { Context } from "hono";
import { prisma, type Database } from "@school-clerk/db";
import { resolveDashboardAppRootDomain } from "@school-clerk/utils";
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
  currentUser?: {
    id: string;
    email: string;
    name: string;
    role: string | null;
    saasAccountId: string | null;
  };
  //   geo: ReturnType<typeof getGeoContext>;
  //   teamId?: string;
};
export const createTRPCContext = async (
  _: unknown,
  c: Context
): Promise<TRPCContext> => {
  const authSessionId = c.req.header("Authorization")?.split(" ")[1];
  const appRootDomain = resolveDashboardAppRootDomain(process.env.APP_ROOT_DOMAIN);
  let host = decodeURIComponent(c.req.header()["host"] || "");
  if (process.env.NODE_ENV == "development") {
    host = host?.replaceAll(`.${appRootDomain}`, ".vercel.app");
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
    domain: host?.replace(`.${appRootDomain}`, ""),
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

export async function findAuthSessionByBearer(
  db: Database,
  authSessionId: string,
) {
  return db.session.findFirst({
    where: {
      ...getAuthSessionWhere(authSessionId),
    },
    select: {
      id: true,
      token: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          saasAccountId: true,
        },
      },
    },
  });
}

export function getAuthSessionWhere(authSessionId: string) {
  return {
    deletedAt: null,
    OR: [{ id: authSessionId }, { token: authSessionId }],
  };
}

const requireAuthMiddleware = t.middleware(async (opts) => {
  const authSessionId = opts.ctx.profile.authSessionId;

  if (!authSessionId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to continue.",
    });
  }

  const session = await findAuthSessionByBearer(opts.ctx.db, authSessionId);

  if (!session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Your session is no longer valid.",
    });
  }

  return opts.next({
    ctx: {
      ...opts.ctx,
      currentUser: session.user,
    },
  });
});
// const withTeamPermissionMiddleware = t.middleware(async (opts) => {
//   return withTeamPermission({
//     ctx: opts.ctx,
//     next: opts.next,
//   });
// });

export const publicProcedure = t.procedure.use(withPrimaryDbMiddleware);
export const authenticatedProcedure = publicProcedure.use(requireAuthMiddleware);
