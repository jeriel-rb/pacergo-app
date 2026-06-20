import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship raw TS/TSX; let Next transpile them.
  transpilePackages: ["@pacergo/shared", "@pacergo/api"],
};

export default nextConfig;
