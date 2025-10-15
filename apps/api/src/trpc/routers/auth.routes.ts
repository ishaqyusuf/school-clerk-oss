import { createTRPCRouter, publicProcedure } from "../init";

export const authRouter = createTRPCRouter({
  getProfile: publicProcedure.query(async (props) => {
    const authSession = await props.ctx.db.session.findFirst({
      where: {
        id: props.ctx.profile.authSessionId,
      },
      select: {
        user: {
          select: {
            tenant: {
              select: {
                schools: {
                  where: {
                    OR: [
                      {
                        subDomain: props.ctx.profile.domain,
                        deletedAt: null,
                      },
                      {
                        domains: {
                          some: {
                            domain: props.ctx.profile.domain,
                            deletedAt: null,
                          },
                        },
                      },
                    ],
                  },
                  select: {
                    id: true,
                    sessions: {
                      take: 1,
                      orderBy: {
                        createdAt: "desc",
                      },
                      select: {
                        id: true,
                        title: true,
                        terms: {
                          take: 1,
                          select: {
                            id: true,
                            title: true,
                          },
                          orderBy: {
                            createdAt: "desc",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const school = authSession?.user?.tenant?.schools?.[0];
    const session = school?.sessions?.[0];
    const term = session?.terms?.[0];
    const cookieData = {
      // domain: domain,
      sessionId: session?.id,
      termId: term?.id,
      schoolId: school?.id,
      sessionTitle: session?.title,
      termTitle: term?.title,
    };
    return cookieData;
  }),
});
