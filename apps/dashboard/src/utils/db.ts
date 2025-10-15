import { prisma } from "@school-clerk/db";

export const transaction = async <T>(
  fn: (tx: typeof prisma) => Promise<T>,
  timeout = 20000,
): Promise<T> => {
  return prisma.$transaction(fn, {
    timeout,
  });
};
