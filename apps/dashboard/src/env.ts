import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets";
import { z } from "zod";

// import { z } from "zod";

export const env = createEnv({
  extends: [vercel],
  shared: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  server: {
    // This is optional because it's only used in development.
    // See https://next-auth.js.org/deployment.
    // NEXTAUTH_URL: z.string().url().optional(),
    BETTER_AUTH_SECRET: z.string().min(1),
    // GITHUB_CLIENT_ID: z.string().min(1),
    // GITHUB_CLIENT_SECRET: z.string().min(1),
    // STRIPE_API_KEY: z.string().min(1),
    // STRIPE_WEBHOOK_SECRET: z.string().min(1),
    APP_ROOT_DOMAIN: z.string().min(1),
    VERCEL_TEAM_ID: z.string().min(1),
    VERCEL_PROJECT_SLUG: z.string().min(1),
    VERCEL_PROJECT_ID: z.string().min(1),
    VERCEL_BEARER_TOKEN: z.string().min(1),
  },
  client: {
    // BETTER_AUTH_SECRET: z.string().min(1),
    // NEXT_PUBLIC_APP_URL: z.string().min(1),
    // NEXT_PUBLIC_STRIPE_PRO_PRODUCT_ID: z.string().optional(),
    // NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
    // NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
    // NEXT_PUBLIC_STRIPE_BUSINESS_PRODUCT_ID: z.string().optional(),
    // NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID: z.string().optional(),
    // NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID: z.string().optional(),
    // NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    // NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  },
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    // BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
