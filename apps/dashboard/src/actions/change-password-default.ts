"use server";

import { prisma } from "@school-clerk/db";
import { hash } from "bcrypt-ts";

export async function changePasswordDefault() {
  const [user] = await prisma.user.findMany({
    where: {
      email: "ishaqyusuf024@gmail.com",
    },
    select: {
      id: true,
      password: true,
      email: true,
      accounts: {
        take: 1,
      },
    },
  });
  if (!user?.accounts?.length) {
    await prisma.account.create({
      data: {
        accountId: user.email,
        // : user.email,
        providerId: "email-password",
        password: user.password,
        user: {
          connect: {
            id: user.id,
          },
        },
      },
    });
  }
  // return await prisma.user.updateMany({
  //   where: {
  //     email: "ishaqyusuf024@gmail.com",
  //   },
  //   data: {
  //     password: await hash("lorem-ipsum", 10),
  //   },
  // });
  //   await prisma.account.create({
  //     data: {
  //     }
  //   })
}
