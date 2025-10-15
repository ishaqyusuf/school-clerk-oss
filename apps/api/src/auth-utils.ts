import type { TRPCContext } from "./trpc/init";

export async function getAuth(ctx: TRPCContext) {
  const user = await ctx.db.user.findFirstOrThrow({
    where: {},
  });
  return {
    id: user.id,
    name: user.name,
  };
}
