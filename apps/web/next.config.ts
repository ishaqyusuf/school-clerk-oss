import type { NextConfig } from "next";

const localSchoolClerkHosts = [
  "school-clerk.localhost",
  "*.school-clerk.localhost",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    ...localSchoolClerkHosts,
    ...localSchoolClerkHosts.map((host) => `http://${host}`),
    ...localSchoolClerkHosts.map((host) => `https://${host}`),
  ],
  transpilePackages: ["@school-clerk/ui", "@school-clerk/tenant-url"],
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
