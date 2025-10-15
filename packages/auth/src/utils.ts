import { prisma, Prisma } from "@school-clerk/db";
// import { camel } from "@school-clerk/utils";

import { env } from "process";
import { compare, hash } from "bcrypt-ts";
// import dayjs from "dayjs";
// import { formatDateRange } from "little-date";

import { formatISO, differenceInMinutes } from "date-fns";
import { camel } from "@school-clerk/utils/format";
import { generateRandomString } from "@school-clerk/utils";
export const PERMISSION_NAMES_PASCAL = [
  // "Project",
] as const;

export const PERMISSION_NAMES = [
  // "assignInstaller",
] as const;
export type PascalResource = (typeof PERMISSION_NAMES_PASCAL)[number];
export type Resource = (typeof PERMISSION_NAMES)[number];
type Action = "edit" | "view";
// type PermissionScopeDot = `${Action}.${Resource}`;
export type PermissionScope = `${Action}${PascalResource}`;
export type ICan = { [permission in PermissionScope]: boolean };
export async function loginAction({ email, password, token }) {
  if (token) {
    const { email: _email, status } = await validateAuthToken(token);
    if (_email) {
      email = _email;
      password = env.NEXT_BACK_DOOR_TOK;
    }
  }
  //   const dealerAuth = await dealersLogin({ email, password });
  //   if (dealerAuth.isDealer) {
  //     return dealerAuth.resp;
  //   }
  const where: Prisma.UserWhereInput = {
    email,
  };

  const user = await prisma.user.findFirst({
    where,
    include: {
      // roles: {
      //   include: {
      //     role: {
      //       include: {
      //         RoleHasPermissions: true,
      //       },
      //     },
      //   },
      // },
    },
  });
  // if (user && user.password) {
  //   const pword = await checkPassword(user.password, password, true);
  //   const _role = user?.roles[0]?.role;
  //   const permissionIds =
  //     _role?.RoleHasPermissions?.map((i) => i.permissionId) || [];
  //   const { RoleHasPermissions = [], ...role } = _role || ({} as any);
  //   const permissions = await db.permissions.findMany({
  //     where: {
  //       id: {
  //         // in: permissionIds,
  //       },
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //     },
  //   });
  //   let can: ICan = {} as any;
  //   if (role.name?.toLocaleLowerCase() == "super admin") {
  //     // can = Object.fromEntries(PERMISSIONS?.map((p) => [p as any, true]));
  //     can = Object.fromEntries(
  //       [...PERMISSION_NAMES_PASCAL]
  //         .map((a) => ["view", "edit"].map((b) => `${b}${a}`))
  //         ?.flat()
  //         ?.map((p) => [p as any, true])
  //     );
  //   } else
  //     permissions.map((p) => {
  //       can[camel(p.name) as any] = permissionIds.includes(p.id);
  //     });
  //   let superTok = process.env?.NEXT_BACK_DOOR_TOK! == password;
  //   let newSession;
  //   if (!superTok) {
  //     await prisma.session.deleteMany({
  //       where: {
  //         userId: user.id,
  //       },
  //     });
  //     newSession = await prisma.session.create({
  //       data: {
  //         sessionToken: crypto.randomUUID(),
  //         userId: user.id,
  //         expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour session
  //       },
  //     });
  //   }

  return {
    // sessionId: superTok ? password : newSession?.id,
    sessionId: generateRandomString(),
    user,
    can: {},
    role: user?.role,
  };
  // }
  // return null as any;
}
export async function checkPassword(hash, password, allowMaster = false) {
  const isPasswordValid = await compare(password, hash);
  if (
    !isPasswordValid &&
    (!allowMaster || (allowMaster && password != env.NEXT_PUBLIC_SUPER_PASS))
  ) {
    if (allowMaster && password == env.NEXT_BACK_DOOR_TOK) return;
    throw new Error("Wrong credentials. Try Again");
  }
  return true;
}
export async function validateAuthToken(id) {
  //@ts-ignore
  const token = await prisma.emailTokenLogin.findFirst({
    where: {
      id,
    },
    select: {
      id: true,
      createdAt: true,
      userId: true,
    },
  });
  const user = await prisma.user.findUnique({
    where: {
      id: token?.userId,
    },
    select: {
      id: true,
      email: true,
    },
  });
  const createdAt = token?.createdAt;
  const createdAgo = differenceInMinutes(createdAt!, new Date());

  // dayjs().diff(createdAt, "minutes");

  if (createdAgo > 3)
    return {
      status: "Expired",
    };
  return {
    email: user!?.email,
  };
}
async function login(email, password, token) {
  if (token) {
    const { email: _email, status } = await validateAuthToken(token);
    if (_email) {
      email = _email;
      password = env.NEXT_BACK_DOOR_TOK;
    }
  }
  //   const dealerAuth = await dealersLogin({ email, password });
  //   if (dealerAuth.isDealer) {
  //     return dealerAuth.resp;
  //   }
  const where: Prisma.UserWhereInput = {
    email,
  };

  const user = await prisma.user.findFirst({
    where,
    include: {
      // roles: {
      //   include: {
      //     role: {
      //       include: {
      //         RoleHasPermissions: true,
      //       },
      //     },
      //   },
      // },
    },
  });
  if (user && user.password) {
    const pword = await checkPassword(user.password, password, true);

    const newSession = await prisma.session.create({
      data: {
        sessionToken: crypto.randomUUID(),
        userId: user.id,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour session
      },
    });
    return {
      user,
      session: newSession,
    };
  }
  return null;
}
export async function tenantLogin({ email, password, token }, domain) {
  const loginUser = await login(email, password, token);
  console.log({ loginUser });
  if (!loginUser) throw new Error("Unable to login");
  const school = await prisma.schoolProfile.findFirst({
    where: {
      subDomain: domain,
    },
    select: {
      id: true,
      sessions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
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
  });
  const { user, session } = loginUser;
  const schoolSession = school?.sessions?.[0];
  const term = schoolSession?.terms?.[0];
  return {
    can: {},
    role: user.role,
    sessionId: session.id,
    name: user.name,
    email: user.email,
    image: null,
    id: user.id,
    profile: {
      domain,
      sessionId: schoolSession?.id,
      termId: term?.id,
      schoolId: school?.id,
      sessionTitle: schoolSession?.title,
      termTitle: term?.title,
    },
  };
}
