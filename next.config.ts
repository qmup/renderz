import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "*": [
      "./data/catalog.snapshot.sqlite",
      "./data/images.sqlite",
      "./drizzle/**",
    ],
  },
};

export default nextConfig;
