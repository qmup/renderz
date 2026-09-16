import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "*": ["./data/catalog.snapshot.sqlite", "./drizzle/**"],
  },
};

export default nextConfig;
