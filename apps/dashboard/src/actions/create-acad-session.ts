"use server";

import { prisma } from "@school-clerk/db";

import { switchSessionTerm } from "./cookies/auth-cookie";
import { requireDashboardModules } from "@/lib/module-access";
import { actionClient } from "./safe-action";
import { createAcadSessionSchema } from "./schema";

export const createAcadSessionAction = actionClient
  .schema(createAcadSessionSchema)
  .action(async ({ parsedInput: data }) => {
    const { profile, user } = await requireDashboardModules(["ACADEMIC_PROGRAMS"], ["Admin", "Registrar"]);
    // throw new Error("....");
    // await prisma.sessionTerm.deleteMany({});
    // await prisma.schoolSession.deleteMany({});
    const resp = await prisma.$transaction(async (tx) => {
      const schoolSession = await tx.schoolSession.create({
        data: {
          title: data.title,
          school: {
            connect: {
              id: profile?.schoolId,
              accountId: user.saasAccountId,
              deletedAt: null,
            },
          },
          terms: {
            createMany: data.terms?.length
              ? {
                  data: data.terms.map((d) => ({
                    schoolId: profile?.schoolId,
                    title: d.title,
                    startDate: d.startDate,
                    endDate: d.endDate,
                  })),
                }
              : undefined,
          },
        },
        select: {
          id: true,
          terms: {
            orderBy: {
              startDate: "desc",
            },
          },
        },
      });
      return schoolSession;
    });
    await switchSessionTerm({ sessionId: resp.id, termId: resp.terms[0]?.id });
    // console.log(resp);
    // throw new Error("", {
    //   cause: resp,
    // });
    // const termId = resp?.terms?.
    return resp;
  });
