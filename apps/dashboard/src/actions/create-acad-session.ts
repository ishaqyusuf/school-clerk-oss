"use server";

import { prisma } from "@school-clerk/db";

import { getAuthCookie, switchSessionTerm } from "./cookies/auth-cookie";
import { actionClient } from "./safe-action";
import { createAcadSessionSchema } from "./schema";

export const createAcadSessionAction = actionClient
  .schema(createAcadSessionSchema)
  .action(async ({ parsedInput: data }) => {
    // throw new Error("....");
    // await prisma.sessionTerm.deleteMany({});
    // await prisma.schoolSession.deleteMany({});
    const resp = await prisma.$transaction(async (tx) => {
      const profile = await getAuthCookie();
      const schoolSession = await tx.schoolSession.create({
        data: {
          title: data.title,
          school: {
            connect: {
              id: profile?.schoolId,
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
          terms: {
            orderBy: {
              startDate: "desc",
            },
          },
        },
      });
      return schoolSession;
    });
    const termId = (resp as any)?.terms?.[0]?.id;
    await switchSessionTerm(termId);
    // console.log(resp);
    // throw new Error("", {
    //   cause: resp,
    // });
    // const termId = resp?.terms?.
    return resp;
  });
