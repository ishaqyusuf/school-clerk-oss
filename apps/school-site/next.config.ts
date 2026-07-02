import type { NextConfig } from "next";

const localSchoolSiteOrigins = [
  "school-clerk-site.localhost",
  "*.school-clerk-site.localhost",
  "localhost:2400",
  "127.0.0.1:2400",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: localSchoolSiteOrigins,
};

export default nextConfig;
