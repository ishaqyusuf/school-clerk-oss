import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@school-clerk/ui"],
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
