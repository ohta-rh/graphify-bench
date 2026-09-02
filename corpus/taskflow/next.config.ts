import type { NextConfig } from "next";

/**
 * Taskflow — Next.js 16 configuration.
 *
 * Deliberately minimal: Turbopack is the default bundler in Next 16, the React
 * Compiler is stable but left opted-out, and typed routes stay off so that the
 * corpus type-checks without a prior `next build`.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  experimental: {
    typedEnv: false,
  },
};

export default nextConfig;
