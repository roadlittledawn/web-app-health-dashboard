import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    // Skip type checking during builds - do this in CI/CD instead
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
