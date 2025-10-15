"use server";

import { redirect } from "next/navigation";
import { hash } from "bcrypt-ts";
import type z from "zod";

import { prisma } from "@school-clerk/db";
import { slugify } from "@school-clerk/utils";

import { actionClient } from "./safe-action";
import { createSignupSchema } from "./schema";

// const schema = createSignupSchema({} as any);
//z.custom() as ReturnType<typeof createSignupSchema>;
const signupSchema = createSignupSchema({});
export type SignupInput = z.infer<typeof signupSchema>;
export const createSaasProfileAction = actionClient
  .schema(createSignupSchema({}))
  //   .metadata({
  // name: "create-saas-profile",
  //   })
  .action(async ({ parsedInput: input }) => {
    // await prisma.$transaction(async (tx: typeof prisma) => {
    //   await tx.whatIsGoingOn.create({
    //     data: {
    //       name: input.adminName,
    //     },
    //   });
    // });
    const resp = await prisma.$transaction(async (tx) => {
      console.log({ input });

      const password = await hash(input.password, 10);
      const s = await tx.saasAccount.create({
        data: {
          email: input.email,
          name: input.adminName,
          phoneNo: input.phone,

          schools: {
            create: {
              name: input.institutionName,
              subDomain: input.domainName,
              slug: slugify(input.institutionName),
            },
          },
          users: {
            create: {
              name: input.adminName,
              email: input.email,
              password,
              phoneNo: input.phone,
              role: "ADMIN",
            },
          },
        },
        include: {
          schools: true,
        },
      });
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      const host = process.env.APP_ROOT_DOMAIN;
      const subDomain = s.schools?.[0]?.subDomain;
      const redirectUrl = `${protocol}://${subDomain}.${host}`;
      return {
        redirectUrl,
      };
    });
    redirect(resp.redirectUrl);
  });
