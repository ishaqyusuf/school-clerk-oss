import { auth } from "@/auth/server";
import { toNextJsHandler } from "better-auth/next-js";
// export const GET = auth.handler;
// export const POST = auth.handler;

// import { env } from "@/env.mjs";
// import { env } from "@/env";
// import { nextAuthOptions } from "@school-clerk/auth";

// import NextAuth from "next-auth";

// const handler = NextAuth(
//   nextAuthOptions({
//     secret: env.NEXTAUTH_SECRET,
//   })
// );
// const handler = auth.handler;
// export { handler as GET, handler as POST };
export const { POST, GET } = toNextJsHandler(auth);
