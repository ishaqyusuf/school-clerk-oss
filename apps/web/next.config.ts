import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.school-clerk.localhost"],
  transpilePackages: ["@school-clerk/ui"],
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
