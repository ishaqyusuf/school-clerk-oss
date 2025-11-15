import { withSentryConfig } from "@sentry/nextjs";
/** @type {import("next").NextConfig} */
const config = {
  poweredByHeader: false,
  reactStrictMode: true,
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@school-clerk/ui",
    "@school-clerk/api",

    // "@school-clerk/stripe",
  ],
  pageExtensions: ["ts", "tsx", "mdx"],
  experimental: {
    mdxRs: true,
    // serverComponentsExternalPackages: ["@prisma/client"],
    serverExternalPackages: [],
    // serverActions: true,
  },
  images: {
    loader: "custom",
    loaderFile: "./image-loader.ts",
    qualities: [80, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  /** We already do linting and typechecking as separate tasks in CI */
  // eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/((?!api/proxy).*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
  output: "standalone",
};

// module.exports = nextConfig;
const isProduction = process.env.NODE_ENV === "production";

export default isProduction
  ? withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,

      // Only print logs for uploading source maps in CI
      silent: !process.env.CI,

      // Upload source maps for better stack traces
      widenClientFileUpload: true,

      // Tree-shake Sentry logger statements to reduce bundle size
      disableLogger: true,
    })
  : config;
