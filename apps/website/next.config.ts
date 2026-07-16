import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @pacergo/shared ships TS source (main: src/index.ts) — compile it in-app.
  transpilePackages: ["@pacergo/shared"],
};

export default nextConfig;
