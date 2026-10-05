import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deployed via Vercel (apps/web root directory).
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  // Workspace packages ship raw TS/TSX; let Next transpile them.
  transpilePackages: ["@pacergo/shared", "@pacergo/api"],
  // The AI training-plan markdown is read from disk at runtime (server action);
  // trace those files into the production server bundle.
  outputFileTracingIncludes: {
    "/**": ["./src/features/ai-plan/plans/**/*.md"],
  },
};

export default nextConfig;
