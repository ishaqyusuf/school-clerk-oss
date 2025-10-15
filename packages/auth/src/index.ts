import type { BetterAuthOptions } from "better-auth";
// import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@next16/db";
import { nextCookies } from "better-auth/next-js";

export function initAuth(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;
  //   discordClientId: string;
  //   discordClientSecret: string;
}) {
  const config = {
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    baseURL: options.baseUrl,
    // secret: options.secret!,
    secret: process.env.BETTER_AUTH_SECRET,
    account: {
      fields: {
        // providerId
        // accountId: ""
      },
    },
    user: {
      //   fields: {},
      // fields: {
      //   email: true,
      //   createdAt: true,
      //   name: true,
      //   updatedAt: true,
      // },
      additionalFields: {
        role: {
          defaultValue: "Admin",
          required: false,
          type: "string",
        },
        // type: {
        //   type: "string",
        //   required: true,
        // },
      },
    },
    advanced: {
      // cookies:
    },
    emailAndPassword: {
      enabled: true,
      password: {
        // async hash(password) {
        //   return await hash(password, 10);
        // },
        // async verify(data) {
        //   console.log({ data });
        //   return true;
        // },
        // async verify(data) {
        //   return true;
        // },
      },
      async sendResetPassword(data, request) {
        console.log("RESETTING>>>");
        console.log(data);
      },
    },
    plugins: [
      nextCookies(),
      //   username({}),
      //   oAuthProxy({
      //     /**
      //      * Auto-inference blocked by https://github.com/better-auth/better-auth/pull/2891
      //      */
      //     currentURL: options.baseUrl,
      //     productionURL: options.productionUrl,
      //   }),
      //   expo(),
    ],
    socialProviders: {
      //   discord: {
      //     clientId: options.discordClientId,
      //     clientSecret: options.discordClientSecret,
      //     redirectURI: `${options.productionUrl}/api/auth/callback/discord`,
      //   },
      // google: {}
    },
    hooks: {},
    trustedOrigins: [
      "expo://",
      "*.localhost:2200", // Trust all subdomains of example.com (any protocol)
      "https://01f5e232bbc3.ngrok-free.app", // Trust all subdomains of example.com (any protocol)
      //   "https://*.example.com", // Trust only HTTPS subdomains of example.com
      //   "http://*.dev.example.com", // Trust all HTTP subdomains of dev.example.com
    ],
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
