import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TS/TSX; let Next transpile them.
  transpilePackages: ["@pacergo/shared", "@pacergo/api"],
  // The AI training-plan markdown is read from disk at runtime (server action);
  // trace those files into the production server bundle.
  outputFileTracingIncludes: {
    "/**": ["./src/features/ai-plan/plans/**/*.md"],
  },
};

export default nextConfig;
